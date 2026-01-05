import React, { useState, useEffect, useRef } from 'react';
import { Classroom, Transaction, TransactionStatus, User, UserRole, TransactionType } from '../types';
import * as api from '../services/apiService';
import { analyzeSlip } from '../services/geminiService';
import LoadingScreen from './LoadingScreen';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import UserManagement from './UserManagement';
import ConnectLine from './ConnectLine';
import Navigation from './Navigation';
import * as XLSX from 'xlsx';
import { Camera, Upload, CheckCircle, AlertCircle, PlusCircle, X, Sparkles, ShieldAlert, CloudUpload } from 'lucide-react'; 

// 🔥 Config ถูกต้องตามรูปภาพของคุณ
const CLOUDINARY_CLOUD_NAME = "dfztd6dye";
const CLOUDINARY_UPLOAD_PRESET = "classfund_preset";

interface Props {
  classroom: Classroom;
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ classroom, user, onLogout }) => {
  // --- State Core ---
  const [currentClassroom, setCurrentClassroom] = useState<Classroom>(classroom);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [balance, setBalance] = useState(0);
  
  // State for Admin Manual Form
  const [showForm, setShowForm] = useState(false); 
  const [formDefaults, setFormDefaults] = useState<Partial<Transaction> | undefined>(undefined);
  
  // UI & Utility
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
  const [announceText, setAnnounceText] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('home');
  const [subTab, setSubTab] = useState<'PENDING' | 'HISTORY' | 'INDIVIDUAL' | 'MONTHLY'>('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment Form State
  const [payAmount, setPayAmount] = useState<string>('');
  const [payPeriod, setPayPeriod] = useState<string>(''); 
  const [paySlip, setPaySlip] = useState<string | null>(null);
  const [paySlipHash, setPaySlipHash] = useState<string>('');
  const [payNote, setPayNote] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  
  // ✅ State สำหรับเก็บรายการที่เลือกหลายอัน (Multi-select)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // AI & Upload State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Mobile Action Sheet State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const qrInputRef = useRef<HTMLInputElement>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);
  
  const isAdmin = user.role === UserRole.ADMIN;
  const periods = currentClassroom.activePeriods || [];

  useEffect(() => { refreshData(); }, [user._id]);
  useEffect(() => { if (currentClassroom.announcement) setAnnounceText(currentClassroom.announcement); }, [currentClassroom]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const allTxs = await api.getTransactions();
      const allUsers = await api.getUsers();
      const room = await api.initClassroom();
      
      setCurrentClassroom(room);
      setUsers(allUsers);
      const relevantTxs = isAdmin ? allTxs : allTxs.filter(tx => tx.userId === user._id);
      setTransactions(relevantTxs);
      setBalance(api.calculateBalance(allTxs, isAdmin ? undefined : user._id));
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => { 
    try { await api.updateAnnouncement(currentClassroom._id, announceText); alert('บันทึกประกาศเรียบร้อย ✅'); setIsEditingAnnounce(false); refreshData(); } catch (e) { alert('เกิดข้อผิดพลาดในการบันทึกประกาศ'); }
  };

  const handleLineBroadcast = async () => {
     const message = prompt("📢 พิมพ์ข้อความประกาศเข้า LINE:"); if(!message) return;
     if(!confirm(`ยืนยันส่ง: "${message}"?`)) return;
     setIsLoading(true); try { await fetch('https://classfund-web.onrender.com/api/broadcast', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message})}); alert('ส่งสำเร็จ'); } catch(e){ alert('Error'); } finally { setIsLoading(false); }
  };

  // ✅ แก้ไข: ปิดหน้าต่างทันทีที่บันทึกเสร็จ (แก้ปัญหาค้าง)
  const handleAddTransaction = async (tx1: any, tx2?: any) => {
    try { 
      // 1. บันทึกรายการแรก
      await api.addTransaction(tx1); 
      
      // 2. ถ้ามีรายการที่สอง (ล้าง Hash ออกเพื่อไม่ให้ซ้ำ)
      if (tx2) {
          const safeTx2 = { ...tx2, slipHash: undefined };
          await api.addTransaction(safeTx2);
      }
      
      // 3. ปิดหน้าต่างทันที
      setShowForm(false); 
      setFormDefaults(undefined); 
      alert("✅ บันทึกรายการเรียบร้อย");

      // 4. โหลดข้อมูลใหม่เบื้องหลัง
      await refreshData(); 

    } catch (error: any) { 
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleAddPeriod = async () => {
    if(!newPeriodName.trim()) return; const updated = {...currentClassroom, activePeriods: [...periods, newPeriodName.trim()]};
    await api.updateClassroom(updated); setNewPeriodName(''); setShowAddPeriod(false); await refreshData();
  };

  const handleRemovePeriod = async (pName: string) => {
    if(!confirm(`ลบรอบ "${pName}"?`)) return; const newAmts = {...currentClassroom.periodAmounts}; delete newAmts[pName];
    await api.updateClassroom({...currentClassroom, activePeriods: periods.filter(p=>p!==pName), periodAmounts: newAmts}); await refreshData();
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]; if(file){ const r = new FileReader(); r.onloadend = async () => { const u = {...currentClassroom, paymentQrCode: r.result as string}; await api.updateClassroom(u); setCurrentClassroom(u); }; r.readAsDataURL(file); }
  };

  // --- Helper Functions ---
  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ✅ แก้ไข: เพิ่มการเช็ค res.ok เพื่อให้จับ Error Cloudinary ได้แม่นยำขึ้น
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
              method: "POST", body: formData
          });
          
          if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`Cloudinary Error (${res.status}): ${errorText}`);
          }

          const data = await res.json();
          return data.secure_url;
      } catch (error) {
          console.error("Cloudinary Upload Error:", error);
          return null;
      }
  };

  // 🔥🔥🔥 Logic แก้ไขใหม่: Fail-Safe (AI พัง ก็ยังอัปโหลดรูปได้) 🔥🔥🔥
  const handleSlipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)"); return; }
      
      setIsAnalyzing(true);
      setUploadProgress(10);
      setAiMessage("กำลังอัปโหลดรูป...");
      setAiStatus('idle');
      setPaySlip(null);

      // 1. เช็คสลิปซ้ำ
      try {
          const hash = await computeSHA256(file);
          const check = await api.checkSlipDuplicate(hash);
          if (check.isDuplicate) {
              alert(`⛔️ สลิปนี้ถูกใช้ไปแล้ว!\nโดย: ${check.usedBy}`);
              setIsAnalyzing(false);
              setAiMessage("❌ สลิปซ้ำ (ห้ามใช้ซ้ำ)");
              setAiStatus('error');
              e.target.value = ''; 
              return;
          }
          setPaySlipHash(hash);
      } catch (err) { console.warn("Skip duplicate check"); }

      const reader = new FileReader();
      reader.onloadend = async () => { 
          const base64 = reader.result as string;
          try {
              // ✅ Step 1: อัปโหลดรูปก่อนเลย (สำคัญที่สุด)
              // แยกออกมาจาก Promise.all เพื่อไม่ให้ AI Error มาขัดขวางการอัปโหลด
              const cloudinaryUrl = await uploadToCloudinary(file);
              
              if (!cloudinaryUrl) {
                  throw new Error("อัปโหลดรูปไม่สำเร็จ (กรุณาลองใหม่)");
              }

              // อัปโหลดผ่าน -> โชว์รูปทันที
              setPaySlip(cloudinaryUrl);
              setUploadProgress(100);
              
              // ✅ Step 2: ค่อยเรียก AI (ใส่ try/catch แยก)
              setAiMessage("กำลังตรวจสอบยอดเงิน...");
              try {
                  const aiResult = await analyzeSlip(base64);
                  
                  if (aiResult.isValid) {
                      setAiStatus('success');
                      if (aiResult.amount && aiResult.amount > 0) {
                          setPayAmount(aiResult.amount.toString());
                          setAiMessage(`✅ AI ตรวจพบยอด: ${aiResult.amount} บาท`);
                      } else {
                          setAiMessage("⚠️ AI อ่านยอดไม่ได้ (กรุณากรอกเอง)");
                      }
                  } else {
                      // AI บอกว่ารูปผิดปกติ แต่เราแค่เตือน (ไม่ลบรูป)
                      console.warn("AI Invalid:", aiResult.message);
                      setAiMessage("⚠️ รูปอาจไม่ชัดเจน (กรอกยอดเองได้เลย)");
                      setAiStatus('success'); 
                  }
              } catch (aiError) {
                  // ถ้า AI พัง (429 Quota Exceeded) ให้ลงมาตรงนี้
                  console.warn("AI Quota Error (Ignored):", aiError);
                  setAiMessage("⚠️ AI ไม่ว่าง (กรอกยอดเองได้เลย)");
                  setAiStatus('success'); // ยอมให้ผ่าน
              }

          } catch (error: any) {
              console.error("Critical Error:", error);
              setAiMessage("❌ อัปโหลดล้มเหลว");
              setAiStatus('error');
              setPaySlip(null);
          } finally {
              setIsAnalyzing(false);
              setUploadProgress(0);
          }
      };
      reader.readAsDataURL(file);
    }
  };

  
  const handleQuickTagClick = (tagName: string) => {
      // 1. ตรวจสอบจากค่าปัจจุบันใน State โดยตรง
      const isSelected = selectedTags.includes(tagName);
      
      let newTags;
      
      if (isSelected) {
          // ถ้ามีแล้ว -> เอาออก
          newTags = selectedTags.filter(t => t !== tagName);
      } else {
          // ถ้าไม่มี -> เพิ่มเข้าไป
          newTags = [...selectedTags, tagName];
      }

      // 2. อัปเดต State ทั้งสองอย่างพร้อมกันทันที (ไม่ต้องรอ useEffect)
      setSelectedTags(newTags);
      setPayNote(newTags.join(', ')); 
      
      // ❌ ไม่แตะต้อง setPayAmount (ตามที่ขอ)
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) { alert("กรุณาระบุจำนวนเงิน"); return; }
    if (!payNote.trim()) { alert("⚠️ กรุณาระบุหมายเหตุ"); return; }
    if (!paySlip && !isAdmin) { alert("กรุณาแนบสลิป (รออัปโหลดให้เสร็จก่อน)"); return; }
    
    setIsSubmittingPay(true);
    try {
        const status = isAdmin ? TransactionStatus.APPROVED : TransactionStatus.PENDING;
        const txData = {
            userId: user._id,
            studentName: user.name,
            classroomId: currentClassroom.id,
            type: TransactionType.DEPOSIT,
            amount: parseFloat(payAmount),
            
            period: payNote, // ใช้ Note เป็นชื่อรายการ
            note: payNote,
            
            slipImage: paySlip || undefined,
            slipHash: paySlipHash,
            status: status,
            approver: isAdmin ? user.name : undefined,
            date: new Date().toISOString()
        };
        await api.addTransaction(txData);
        alert(isAdmin ? "✅ บันทึกยอดเงินเรียบร้อย (อนุมัติทันที)" : "✅ แจ้งโอนเงินสำเร็จ! รอผู้ดูแลตรวจสอบครับ");
        
        // Reset Form
        setPayAmount(''); setPayPeriod(''); setPaySlip(null); setPayNote(''); 
        setAiMessage(''); setAiStatus('idle'); setPaySlipHash(''); setSelectedTags([]); // ล้าง Tags
        
        if (isAdmin) { setActiveMainTab('home'); setSubTab('HISTORY'); } else { setActiveMainTab('home'); setSubTab('PENDING'); }
        refreshData();
    } catch (error) {
        console.error(error); alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
        setIsSubmittingPay(false);
    }
  };
  
  // Mobile Action Handlers
  const handleMobileApprove = async () => {
    if (!selectedTx) return;
    try {
        await api.updateTransaction(selectedTx._id!, { status: TransactionStatus.APPROVED, approver: user.name });
        setSelectedTx(null);
        refreshData();
    } catch(e) { alert("Error"); }
  };

  const handleMobileReject = async () => {
    if (!selectedTx) return;
    if (!confirm('ต้องการยกเลิกรายการนี้?')) return;
    try {
        await api.updateTransaction(selectedTx._id!, { status: TransactionStatus.REJECTED, approver: user.name });
        setSelectedTx(null);
        refreshData();
    } catch(e) { alert("Error"); }
  };

  const handleMobileEdit = () => {
    if (!selectedTx) return;
    setFormDefaults(selectedTx);
    setShowForm(true);
    setSelectedTx(null);
  };

  const getPeriodTotal = (pName: string) => transactions.filter(t => t.period === pName && t.status === TransactionStatus.APPROVED).reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

  const exportToExcel = () => {
    const students = users.filter(u => u.role === UserRole.STUDENT);
    const header = ['ลำดับ', 'ชื่อ-นามสกุล', ...periods, 'ยอดรวมจ่ายจริง (บาท)'];
    const body = students.map((u, index) => {
      let studentTotal = 0;
      const statusCols = periods.map(p => {
        const paidTxs = transactions.filter(t => t.userId === u._id && t.period === p && t.status === TransactionStatus.APPROVED);
        if (paidTxs.length > 0) {
          const sum = paidTxs.reduce((acc, t) => acc + t.amount, 0);
          studentTotal += sum;
          return sum.toLocaleString();
        }
        return '-';
      });
      return [index + 1, u.name, ...statusCols, studentTotal];
    });
    const footer = ['', 'รวมยอดรับจริง (บาท)', ...periods.map(p => getPeriodTotal(p).toLocaleString()), balance.toLocaleString()];
    const allData = [header, ...body, footer];
    const ws = XLSX.utils.aoa_to_sheet(allData);
    ws['!cols'] = [{ wch: 10 }, { wch: 30 }, ...periods.map(() => ({ wch: 15 })), { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานสรุปยอด");
    XLSX.writeFile(wb, `สรุปยอด_${currentClassroom.name}.xlsx`);
  };

  const renderTableContent = () => {
    if (subTab === 'MONTHLY' && isAdmin) {
      return (
        <div className="min-w-full overflow-x-auto">
            <table className="w-full text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left border-b sticky left-0 bg-slate-50 z-10 w-[150px]">รายชื่อ</th>
                {periods.map(p => (
                  <th key={p} className="p-3 text-center border-b min-w-[100px] relative group">
                    <span>{p}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleRemovePeriod(p); }} className="absolute -top-1 -right-1 hidden group-hover:flex bg-red-500 text-white w-4 h-4 rounded-full items-center justify-center text-[10px]">&times;</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === UserRole.STUDENT).map(u => (
                <tr key={u._id} className="hover:bg-slate-50 border-b">
                  <td className="p-3 font-bold sticky left-0 bg-white border-r z-10">{u.name}</td>
                  {periods.map(p => {
                    const paid = transactions.filter(t => t.userId === u._id && t.period === p && t.status === TransactionStatus.APPROVED).reduce((a, t) => a + t.amount, 0);
                    return <td key={p} className="p-3 text-center">{paid > 0 ? <span className="text-emerald-600 font-bold">{paid.toLocaleString()}</span> : <span className="text-gray-200">-</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (subTab === 'INDIVIDUAL') {
        return (
            <table className="w-full text-left">
              <thead className="bg-slate-50 font-bold"><tr><th className="p-4">ชื่อ</th><th className="p-4 text-right">คงเหลือ</th></tr></thead>
              <tbody>{users.filter(u => u.role === UserRole.STUDENT).map(u => (<tr key={u._id} className="border-b hover:bg-gray-50"><td className="p-4">{u.name}</td><td className="p-4 text-right font-mono font-bold text-emerald-600">{api.calculateBalance(transactions, u._id).toLocaleString()} ฿</td></tr>))}</tbody>
            </table>
        );
    }
    return (
      <TransactionList
        transactions={transactions}
        isAdmin={isAdmin}
        periods={periods}
        onStatusChange={async (id, status, p1, a1, p2, a2) => {
          await api.updateTransaction(id, { 
            status, 
            period: p1, 
            amount: a1, 
            approver: user.name 
        });

        // 2. ถ้ามีรายการที่ 2 (p2) ให้สร้างใหม่
        if (p2 && (a2 || 0) > 0) { 
            const org = transactions.find(t => t._id === id);
            if (org) {
                const tx2 = { 
                    ...org, 
                    _id: undefined, 
                    amount: a2, 
                    period: p2, 
                    status: TransactionStatus.APPROVED, 
                    note: org.note ? `${org.note} (ส่วนเพิ่ม)` : `(ส่วนเพิ่ม)`, 
                    approver: user.name,
                    slipHash: undefined 
                };
                await api.addTransaction(tx2 as any); 
            } 
        }
        await refreshData();
    }}
    filter={subTab === 'PENDING' ? 'PENDING' : 'ALL'}
  />
);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 font-sarabun text-slate-800 pb-24 md:pb-0">
      
      <Navigation activeTab={activeMainTab} setActiveTab={setActiveMainTab} onLogout={onLogout} isAdmin={isAdmin} />

      {/* --- PAGE: SCAN & PAY --- */}
      {activeMainTab === 'scan' && (
        <div className="animate-fade-in flex flex-col items-center justify-start pt-6 px-4 md:pt-10 pb-20">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative flex flex-col mt-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            {/* 1. QR Code */}
            <div className="p-6 text-center border-b border-gray-100 bg-emerald-50/30">
              <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">QR รับเงินกองกลาง</p>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 inline-block relative group">
                {currentClassroom.paymentQrCode ? (
                  <img src={currentClassroom.paymentQrCode} className="w-40 h-40 object-contain mix-blend-multiply" alt="QR Code" />
                ) : (
                  <div className="w-40 h-40 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-300">
                    <span className="text-4xl mb-2">📷</span>
                    <span className="text-xs">ไม่มี QR Code</span>
                  </div>
                )}
                {isAdmin && <button onClick={() => qrInputRef.current?.click()} className="absolute bottom-2 right-2 bg-gray-100 hover:bg-white p-2 rounded-full shadow-md text-xs">✏️ แก้ไข</button>}
              </div>
              <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
              <p className="text-[10px] text-gray-400 mt-2">บัญชี: เงินห้อง DIT #67</p>
            </div>

            {/* 2. Form */}
            <form onSubmit={handleSubmitPayment} className="p-6 flex flex-col gap-4">
               <div className="flex items-center gap-2 mb-1">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">2</div>
                   <h3 className="font-bold text-gray-700">แจ้งรายละเอียดการโอน</h3>
               </div>
               
               <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">จำนวนเงิน</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    placeholder="0.00" 
                    value={payAmount} 
                    onChange={(e) => setPayAmount(e.target.value)} 
                    className={`w-full mt-1 p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 text-lg font-bold text-emerald-600 placeholder-gray-300 ${isAnalyzing ? 'opacity-50' : ''}`}
                  />
               </div>

               {/* 🔥 AI Upload Section 🔥 */}
               <div>
                  <label className="text-xs font-bold text-gray-500 ml-1 flex justify-between">
                      <span>หลักฐาน (สลิป)</span>
                      {isAnalyzing && <span className="text-emerald-500 text-[10px] animate-pulse">กำลังตรวจสอบกับ AI...</span>}
                  </label>
                  <label 
                    className={`mt-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                        ${aiStatus === 'error' ? 'border-red-400 bg-red-50' : 
                          aiStatus === 'success' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}
                        ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}`}
                  >
                     <input type="file" accept="image/*" className="hidden" onChange={handleSlipSelect} disabled={isAnalyzing} />

                     {paySlip ? (
                        <div className="relative w-full h-32 flex flex-col items-center">
                            <img src={paySlip} className="w-full h-full object-contain rounded-lg" />
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                                    <Sparkles className="text-emerald-500 animate-spin mb-2" />
                                    <span className="text-xs font-bold text-emerald-600">AI Scanning...</span>
                                </div>
                            )}
                        </div>
                     ) : (
                        <><Upload className="text-gray-400 mb-2 group-hover:scale-110 transition-transform" size={24} /><p className="text-xs text-gray-400">คลิกแนบสลิป (ตรวจสอบอัตโนมัติ)</p></>
                     )}
                  </label>
                  
                  {aiMessage && (
                      <div className={`mt-2 text-xs flex items-center gap-1 font-bold ${aiStatus === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {aiStatus === 'error' ? <ShieldAlert size={14}/> : <CheckCircle size={14}/>}
                          {aiMessage}
                      </div>
                  )}
               </div>

               <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">หมายเหตุ <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="เช่น ค่าเสื้อ, ค่าห้องเดือน ส.ค." value={payNote} onChange={(e) => setPayNote(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
                  
                  {/* 🔥 Multi-Select Tags (กดได้หลายอัน) 🔥 */}
                  {periods.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {periods.map(p => (
                            <button
                                key={p}
                                type="button" // ✅ ใส่ type="button" สำคัญมาก!
                                onClick={() => handleQuickTagClick(p)}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all active:scale-95 border
                                    ${selectedTags.includes(p) 
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md transform scale-105' // Active (Selected)
                                        : 'bg-gray-100 text-gray-500 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600' // Inactive
                                    }`}
                            >
                                {selectedTags.includes(p) ? '✓ ' : '+ '} 
                                {p} {currentClassroom.periodAmounts?.[p] && `(${currentClassroom.periodAmounts[p]}.-)`}
                            </button>
                        ))}
                    </div>
                  )}
               </div>
               
               <button type="submit" disabled={isSubmittingPay || isAnalyzing || aiStatus === 'error'} className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${isSubmittingPay || isAnalyzing || aiStatus === 'error' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                 {isSubmittingPay ? 'กำลังส่ง...' : <><CheckCircle size={20} /><span>ยืนยัน</span></>}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* --- PAGE: HOME --- */}
      {activeMainTab === 'home' && (
        <main className="max-w-5xl mx-auto px-4 pt-12 pb-24 md:p-8 space-y-6 animate-fade-in">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h1 className="text-2xl font-bold text-gray-800">สวัสดี, {user.name} 👋</h1>
                <p className="text-gray-500 text-sm">ยินดีต้อนรับสู่ระบบ {currentClassroom.name}</p>
             </div>
             <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                {!isAdmin && (
                    <>
                        <div className="text-right">
                           <p className="text-xs text-gray-400 uppercase font-bold">ยอดเงินส่วนตัว</p>
                           <p className="text-3xl font-bold text-emerald-600">{api.calculateBalance(transactions, user._id).toLocaleString()} ฿</p>
                        </div>
                        <div className="h-10 w-px bg-gray-100"></div>
                    </>
                )}
                <div className="text-right">
                    <p className="text-sm text-gray-400 uppercase font-bold">เงินกองกลาง</p>
                    <p className="text-3xl font-extrabold text-emerald-600">{balance.toLocaleString()} ฿</p>
                </div>
             </div>
          </div>

          {(isAdmin || currentClassroom.announcement) && (
            <div className={`p-6 rounded-3xl shadow-sm border overflow-hidden transition-all duration-300 relative ${currentClassroom.announcement
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent'
                : 'bg-white border-dashed border-gray-300'
              }`}>
  
              {currentClassroom.announcement && (
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              )}
  
              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">📢</span>
                    <h3 className={`font-bold ${currentClassroom.announcement ? 'text-white' : 'text-gray-400'}`}>
                      ประกาศจากผู้ดูแล
                    </h3>
                    {currentClassroom.announcementDate && currentClassroom.announcement && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white/90">
                        {new Date(currentClassroom.announcementDate).toLocaleDateString('th-TH')}
                      </span>
                    )}
                  </div>
  
                  {isEditingAnnounce ? (
                    <div className="mt-2 animate-fade-in">
                      <textarea className="w-full p-3 rounded-xl text-gray-800 text-sm border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none resize-none" rows={3} placeholder="พิมพ์ข้อความประกาศ..." value={announceText} onChange={(e) => setAnnounceText(e.target.value)} autoFocus />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button onClick={() => setIsEditingAnnounce(false)} className="text-xs text-white/80 hover:text-white px-3 py-2">ยกเลิก</button>
                        <button onClick={handleSaveAnnouncement} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 shadow-lg">บันทึก</button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm leading-relaxed whitespace-pre-line ${currentClassroom.announcement ? 'text-white/95' : 'text-gray-400 italic'}`}>
                      {currentClassroom.announcement || "ยังไม่มีประกาศใหม่ (กดปุ่มแก้ไขเพื่อเพิ่มประกาศ)"}
                    </p>
                  )}
                </div>
  
                {isAdmin && !isEditingAnnounce && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={handleLineBroadcast} className="bg-[#06C755] hover:bg-[#05b34c] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#06C755]/20 border border-transparent">
                      ประกาศ LINE
                    </button>
                    <button onClick={() => setIsEditingAnnounce(true)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all flex items-center justify-center backdrop-blur-md border border-white/20">
                      แก้ไข
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {!isAdmin && (
                 <button onClick={() => setActiveMainTab('scan')} className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-between group transition-all">
                    <div className="text-left"><p className="font-bold text-lg">แจ้งฝากเงิน</p><p className="text-emerald-100 text-xs">คลิกเพื่อสแกนและแนบสลิป</p></div>
                    <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📸</div>
                 </button>
             )}

             {isAdmin && (
                <>
                  <div onClick={()=>setSubTab('PENDING')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-amber-200 transition-colors">
                     <p className="text-gray-400 text-[10px] uppercase font-bold">รอตรวจสอบ</p>
                     <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
                  </div>
                  <div onClick={()=>setShowUserMgmt(true)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors flex flex-col justify-center items-center gap-1 text-indigo-500">
                     <span className="text-2xl">👥</span><span className="text-xs font-bold">จัดการสมาชิก</span>
                  </div>
                  <div onClick={()=>setShowForm(true)} className="col-span-2 md:col-span-2 bg-indigo-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer flex items-center justify-between hover:bg-indigo-700 transition-all">
                      <div><p className="font-bold">บันทึกรายรับ</p><p className="text-indigo-200 text-xs">สร้างรายการด้วยตัวเอง</p></div><PlusCircle size={28} />
                  </div>
                </>
             )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
             <div className="p-4 border-b border-gray-50 flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                {isAdmin && (
                    <>
                      <button onClick={()=>setSubTab('PENDING')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab==='PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>รออนุมัติ ({pendingCount})</button>
                      <button onClick={()=>setSubTab('MONTHLY')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab==='MONTHLY' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>ตารางจ่ายเงิน</button>
                    </>
                )}
                <button onClick={()=>setSubTab('HISTORY')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab==='HISTORY' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>ประวัติ</button>
                <button onClick={()=>setSubTab('INDIVIDUAL')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab==='INDIVIDUAL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>รายคน</button>
                
                {isAdmin && subTab === 'MONTHLY' && (
                    <div className="ml-auto flex gap-2">
                        <button onClick={()=>setShowAddPeriod(true)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold">+ รอบ</button>
                        <button onClick={exportToExcel} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold">Excel</button>
                    </div>
                )}
             </div>

             <div className="p-0">
                <div className="overflow-x-auto">
                    {renderTableContent()}
                </div>
             </div>
          </div>
        </main>
      )}

      {/* MOBILE ACTION SHEET (สำหรับ Admin) */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col justify-end animate-fade-in" onClick={() => setSelectedTx(null)}>
            <div className="bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">จัดการรายการ</h3>
                        <p className="text-sm text-gray-500">{selectedTx.studentName} - {selectedTx.amount} บาท</p>
                    </div>
                    <button onClick={() => setSelectedTx(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                
                {selectedTx.slipImage && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center">
                        <img src={selectedTx.slipImage} className="max-h-60 rounded-lg shadow-sm" />
                        <a href={selectedTx.slipImage} target="_blank" className="text-xs text-blue-500 mt-2 underline font-bold">ดูรูปเต็ม</a>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    {selectedTx.status === 'PENDING' && (
                        <>
                            <button onClick={handleMobileReject} className="py-3 bg-red-100 text-red-600 rounded-xl font-bold flex justify-center items-center gap-2 active:scale-95 transition-transform"><X size={18}/> ไม่อนุมัติ</button>
                            <button onClick={handleMobileApprove} className="py-3 bg-green-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform"><CheckCircle size={18}/> อนุมัติ</button>
                        </>
                    )}
                    <button onClick={handleMobileEdit} className="col-span-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-200"><PlusCircle size={18}/> แก้ไขข้อมูล</button>
                </div>
            </div>
        </div>
      )}

      {showAddPeriod && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              <h3 className="font-bold mb-4">เพิ่มรอบการเก็บเงิน</h3>
              <input autoFocus value={newPeriodName} onChange={e=>setNewPeriodName(e.target.value)} className="w-full border p-2 rounded-xl mb-4" placeholder="ชื่อรอบ" />
              <div className="flex gap-2"><button onClick={()=>setShowAddPeriod(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button><button onClick={handleAddPeriod} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl">เพิ่ม</button></div>
           </div>
        </div>
      )}

      {showForm && ( <TransactionForm classroom={currentClassroom} userRole={user.role} currentUserId={user._id} currentUserName={user.name} users={users} defaultValues={formDefaults} onSubmit={handleAddTransaction} onCancel={() => { setShowForm(false); setFormDefaults(undefined); }} /> )}
      {showUserMgmt && <UserManagement onClose={() => { setShowUserMgmt(false); refreshData(); }} />}
  
      <a 
      href="https://m.me/peerawit.yamsakol.2025" 
      target="_blank" 
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
    >
       <div className="relative">
         <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20"></div>
         <div className="bg-gradient-to-tr from-red-500 to-rose-400 p-2 rounded-full text-white shadow-lg relative z-10">
            <AlertCircle size={20} />
         </div>
       </div>
       <div className="text-left hidden md:block">
          <p className="text-[10px] text-slate-400 font-medium">พบปัญหาการใช้งาน?</p>
          <p className="text-sm font-bold text-slate-700">ติดต่อผู้ดูแล</p>
       </div>
    </a>

      {user && !isAdmin && !(user as any).lineUserId && ( <ConnectLine currentUser={user} onLinkSuccess={() => window.location.reload()} /> )}
    </div>
  );
};

export default Dashboard;