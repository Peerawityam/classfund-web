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
// ✅ Import ไอคอน Lock และอื่นๆ ครบถ้วน
import { Lock, Upload, CheckCircle, AlertCircle, PlusCircle, X, Sparkles, ShieldAlert, MousePointerClick, Trophy, Star, Crown, Medal, Zap } from 'lucide-react';

// 🔥 Config
const CLOUDINARY_CLOUD_NAME = "dfztd6dye";
const CLOUDINARY_UPLOAD_PRESET = "classfund_preset";

// --- Gamification Logic ---
const calculateLevel = (totalPaid: number) => {
  const xp = totalPaid * 10;
  if (xp < 1000) return { level: 1, title: 'เด็กใหม่ 🐣', nextXp: 1000, color: 'bg-gray-400' };
  if (xp < 4000) return { level: 2, title: 'ผู้ช่วยห้อง 🥉', nextXp: 4000, color: 'bg-amber-600' };
  if (xp < 8000) return { level: 3, title: 'เศรษฐีประจำห้อง 🥈', nextXp: 8000, color: 'bg-slate-400' };
  if (xp < 12000) return { level: 4, title: 'ป๋าเปย์ตัวจริง 🥇', nextXp: 12000, color: 'bg-yellow-400' };
  return { level: 5, title: 'ตำนานแห่ง ClassFund 💎', nextXp: 15000, color: 'bg-rose-500' };
};

const getBadges = (totalPaid: number, txCount: number) => {
  const badges = [];
  if (totalPaid > 0) badges.push({ id: 'first_blood', icon: <Zap size={14} />, name: 'เปิดบิลแรก', color: 'bg-yellow-100 text-yellow-700' });
  if (totalPaid >= 500) badges.push({ id: 'supporter', icon: <Star size={14} />, name: 'ผู้สนับสนุน', color: 'bg-blue-100 text-blue-700' });
  if (totalPaid >= 1000) badges.push({ id: 'whale', icon: <Crown size={14} />, name: 'สายเปย์', color: 'bg-purple-100 text-purple-700' });
  if (txCount >= 5) badges.push({ id: 'consistent', icon: <Medal size={14} />, name: 'จ่ายสม่ำเสมอ', color: 'bg-green-100 text-green-700' });
  return badges;
};

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

  // Multi-select Tags
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

      setBalance(api.calculateBalance(allTxs));
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ฟังก์ชันเปิด-ปิดระบบรับเงิน
  const handleTogglePaymentSystem = async () => {
    const newState = !currentClassroom.isPaymentActive;
    const confirmMsg = newState
      ? "ต้องการ 'เปิด' ระบบรับชำระเงินใช่ไหม?"
      : "ต้องการ 'ปิด' ระบบรับชำระเงินชั่วคราวใช่ไหม? (สมาชิกจะเข้าหน้านั้นไม่ได้)";

    if (!confirm(confirmMsg)) return;

    try {
      const updated = { ...currentClassroom, isPaymentActive: newState };
      await api.updateClassroom(updated);
      setCurrentClassroom(updated);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
      console.error(error);
    }
  };

  const handleSaveAnnouncement = async () => {
    try { await api.updateAnnouncement(currentClassroom._id, announceText); alert('บันทึกประกาศเรียบร้อย ✅'); setIsEditingAnnounce(false); refreshData(); } catch (e) { alert('เกิดข้อผิดพลาดในการบันทึกประกาศ'); }
  };

  const handleLineBroadcast = async () => {
    const message = prompt("📢 พิมพ์ข้อความประกาศเข้า LINE:");
    if (!message || message.trim() === "") return;

    const adminPin = prompt("🔒 กรุณาใส่รหัส Admin เพื่อยืนยันการส่ง:");
    if (adminPin !== "00189") {
      alert("❌ รหัสผิดพลาด ยกเลิกการส่ง");
      return;
    }

    if (!confirm(`ยืนยันส่งข้อความนี้ให้สมาชิกทุกคน?\n\n"${message}"`)) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://classfund-web.onrender.com/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), pin: adminPin })
      });

      if (response.ok) {
        alert('✅ ส่งประกาศสำเร็จเรียบร้อย');
      } else {
        const errorData = await response.json();
        alert(`❌ ส่งไม่สำเร็จ: ${errorData.message || 'เกิดข้อผิดพลาด'}`);
      }
    } catch (e) {
      console.error(e);
      alert('❌ Error: ไม่สามารถเชื่อมต่อ Server ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (tx1: any, tx2?: any) => {
    try {
      await api.addTransaction(tx1);
      if (tx2) {
        const safeTx2 = { ...tx2, slipHash: undefined };
        await api.addTransaction(safeTx2);
      }
      setShowForm(false);
      setFormDefaults(undefined);
      alert("✅ บันทึกรายการเรียบร้อย");
      await refreshData();
    } catch (error: any) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleAddPeriod = async () => {
    if (!newPeriodName.trim()) return; const updated = { ...currentClassroom, activePeriods: [...periods, newPeriodName.trim()] };
    await api.updateClassroom(updated); setNewPeriodName(''); setShowAddPeriod(false); await refreshData();
  };

  const handleRemovePeriod = async (pName: string) => {
    if (!confirm(`ลบรอบ "${pName}"?`)) return; const newAmts = { ...currentClassroom.periodAmounts }; delete newAmts[pName];
    await api.updateClassroom({ ...currentClassroom, activePeriods: periods.filter(p => p !== pName), periodAmounts: newAmts }); await refreshData();
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = async () => { const u = { ...currentClassroom, paymentQrCode: r.result as string }; await api.updateClassroom(u); setCurrentClassroom(u); }; r.readAsDataURL(file); }
  };

  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

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

  const handleSlipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ใหญ่เกินไป (สูงสุด 5MB)"); return; }

      setIsAnalyzing(true);
      setUploadProgress(10);
      setAiMessage("กำลังอัปโหลดรูป...");
      setAiStatus('idle');
      setPaySlip(null);

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
          const cloudinaryUrl = await uploadToCloudinary(file);
          if (!cloudinaryUrl) throw new Error("อัปโหลดรูปไม่สำเร็จ");

          setPaySlip(cloudinaryUrl);
          setUploadProgress(100);
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
              console.warn("AI Invalid:", aiResult.message);
              setAiMessage("⚠️ รูปอาจไม่ชัดเจน (กรอกยอดเองได้เลย)");
              setAiStatus('success');
            }
          } catch (aiError) {
            console.warn("AI Quota Error (Ignored):", aiError);
            setAiMessage("⚠️ AI ไม่ว่าง (กรอกยอดเองได้เลย)");
            setAiStatus('success');
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
    const isSelected = selectedTags.includes(tagName);
    let newTags;
    if (isSelected) {
      newTags = selectedTags.filter(t => t !== tagName);
    } else {
      newTags = [...selectedTags, tagName];
    }
    setSelectedTags(newTags);
    setPayNote(newTags.join(', '));
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
        period: payNote,
        note: payNote,
        slipImage: paySlip || undefined,
        slipHash: paySlipHash,
        status: status,
        approver: isAdmin ? user.name : undefined,
        date: new Date().toISOString()
      };
      await api.addTransaction(txData);
      alert(isAdmin ? "✅ บันทึกยอดเงินเรียบร้อย (อนุมัติทันที)" : "✅ แจ้งโอนเงินสำเร็จ! รอผู้ดูแลตรวจสอบครับ");

      setPayAmount(''); setPayPeriod(''); setPaySlip(null); setPayNote('');
      setAiMessage(''); setAiStatus('idle'); setPaySlipHash(''); setSelectedTags([]);

      if (isAdmin) { setActiveMainTab('home'); setSubTab('HISTORY'); } else { setActiveMainTab('home'); setSubTab('PENDING'); }
      refreshData();
    } catch (error) {
      console.error(error); alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleMobileApprove = async () => {
    if (!selectedTx) return;
    try {
      await api.updateTransaction(selectedTx._id!, { status: TransactionStatus.APPROVED, approver: user.name });
      setSelectedTx(null);
      refreshData();
    } catch (e) { alert("Error"); }
  };

  const handleMobileReject = async () => {
    if (!selectedTx) return;
    if (!confirm('ต้องการยกเลิกรายการนี้?')) return;
    try {
      await api.updateTransaction(selectedTx._id!, { status: TransactionStatus.REJECTED, approver: user.name });
      setSelectedTx(null);
      refreshData();
    } catch (e) { alert("Error"); }
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
          const sum = api.calculateBalance(paidTxs, undefined, 'NET'); studentTotal += sum;
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
                    const periodTxs = transactions.filter(t => t.userId === u._id && t.period === p && t.status === TransactionStatus.APPROVED);
                    const paid = api.calculateBalance(periodTxs, undefined, 'NET'); return <td key={p} className="p-3 text-center">{paid > 0 ? <span className="text-emerald-600 font-bold">{paid.toLocaleString()}</span> : <span className="text-gray-200">-</span>}</td>;
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

            {/* QR Code */}
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

            {/* Form */}
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

              {/* AI Upload Section */}
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
                    {aiStatus === 'error' ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
                    {aiMessage}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">หมายเหตุ <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="เช่น ค่าเสื้อ, ค่าห้องเดือน ส.ค." value={payNote} onChange={(e) => setPayNote(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400" />

                {/* Multi-Select Tags */}
                {periods.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {periods.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleQuickTagClick(p)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all active:scale-95 border
                                    ${selectedTags.includes(p)
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md transform scale-105'
                            : 'bg-gray-100 text-gray-500 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'
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

      {/* --- ✅ PAGE: LOCKED SCREEN (หน้าแจ้งเตือนปิดระบบ) --- */}
      {activeMainTab === 'locked' && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-6 animate-fade-in text-center">
            
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center relative z-10 shadow-2xl shadow-slate-200 border-8 border-slate-50">
                    <Lock size={80} className="text-slate-300" />
                    <div className="absolute top-0 right-0 bg-red-500 w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-bounce">
                        <X size={24} className="text-white" />
                    </div>
                </div>
            </div>

            <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">พักก่อนวัยรุ่น! 🛑</h2>
            <p className="text-slate-500 mb-10 text-lg leading-relaxed max-w-xs mx-auto">
                ตอนนี้ระบบ <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg">ปิดรับยอด</span> ชั่วคราว<br/>
                ผู้ดูแลอาจจะกำลังเช็คบัญชีอยู่<br/>
                ไว้มาใหม่นะจ๊ะ...
            </p>

            <button 
                onClick={() => setActiveMainTab('home')} 
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
                <span>รับทราบครับผม</span>
            </button>
        </div>
      )}

      {/* --- PAGE: HOME --- */}
      {activeMainTab === 'home' && (
        <main className="max-w-5xl mx-auto px-4 pt-4 pb-24 md:p-8 space-y-6 animate-fade-in">

          {/* Profile & Gamification Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-800">สวัสดี, {user.name} 👋</h1>
                {!isAdmin && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1 ${calculateLevel(api.calculateBalance(transactions, user._id)).color}`}>
                    <Trophy size={12} /> LV.{calculateLevel(api.calculateBalance(transactions, user._id)).level}
                  </span>
                )}
              </div>

              {isAdmin ? (
                <p className="text-gray-500 text-sm">ยินดีต้อนรับผู้ดูแลระบบ</p>
              ) : (
                <>
                  {/* EXP Bar */}
                  {(() => {
                    const balance = api.calculateBalance(transactions, user._id);
                    const userLevel = calculateLevel(balance);
                    const currentXp = balance * 10;
                    const progress = Math.min((currentXp / userLevel.nextXp) * 100, 100);

                    return (
                      <div className="max-w-xs mt-2">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold">
                          <span>{userLevel.title}</span>
                          <span>{currentXp.toLocaleString()} / {userLevel.nextXp.toLocaleString()} XP</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ease-out ${userLevel.color}`} style={{ width: `${progress}%` }}></div>
                        </div>

                        {/* Badges List */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {getBadges(balance, transactions.filter(t => t.userId === user._id && t.status === TransactionStatus.APPROVED).length).map(badge => (
                            <div key={badge.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${badge.color}`}>
                              {badge.icon} {badge.name}
                            </div>
                          ))}
                          {api.calculateBalance(transactions, user._id) === 0 && (
                            <span className="text-[10px] text-gray-300 italic">ยังไม่มีตราประทับ (เริ่มจ่ายเงินเพื่อสะสม)</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Money Box */}
            <div className="flex items-center gap-6 mt-2 md:mt-0 relative z-10 bg-white/50 backdrop-blur-sm p-2 rounded-2xl">
              {!isAdmin && (
                <>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ยอดเงินส่วนตัว</p>
                    <p className="text-3xl font-bold text-emerald-600">{api.calculateBalance(transactions, user._id).toLocaleString()} ฿</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                </>
              )}
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">เงินกองกลาง</p>
                <p className="text-3xl font-extrabold text-indigo-600">{balance.toLocaleString()} ฿</p>
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

          {/* ✅ ปุ่มเปิด-ปิดรับเงินสำหรับ Admin */}
          {isAdmin && (
            <button
              onClick={handleTogglePaymentSystem}
              className={`ml-2 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm border
                ${currentClassroom.isPaymentActive
                  ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${currentClassroom.isPaymentActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              {currentClassroom.isPaymentActive ? 'ปิดรับเงิน' : 'เปิดรับเงิน'}
            </button>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {!isAdmin && (
              <button 
                // ✅ Logic สลับหน้า: ถ้าเปิดไป scan ถ้าปิดไป locked
                onClick={() => setActiveMainTab(currentClassroom.isPaymentActive ? 'scan' : 'locked')} 
                className={`col-span-2 p-5 rounded-3xl shadow-lg flex items-center justify-between group transition-all relative overflow-hidden
                  ${currentClassroom.isPaymentActive 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200 cursor-pointer' 
                    : 'bg-slate-800 text-slate-400 shadow-slate-300 cursor-pointer' 
                  }`}
              >
                {!currentClassroom.isPaymentActive && (
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                )}

                <div className="text-left relative z-10">
                  <p className="font-bold text-xl mb-1">
                    {currentClassroom.isPaymentActive ? 'แจ้งฝากเงิน' : 'SYSTEM OFFLINE'}
                  </p>
                  <p className={`text-xs ${currentClassroom.isPaymentActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {currentClassroom.isPaymentActive ? 'คลิกเพื่อสแกนและแนบสลิป' : 'ระบบปิดรับยอดชั่วคราว'}
                  </p>
                </div>
                
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-500
                   ${currentClassroom.isPaymentActive 
                      ? 'bg-white/20 group-hover:scale-110 group-hover:rotate-12' 
                      : 'bg-slate-700/50 group-hover:text-red-500'}`}>
                   {currentClassroom.isPaymentActive ? <MousePointerClick size={28} /> : <ShieldAlert size={28}/>}
                </div>
              </button>
            )}

            {isAdmin && (
              <>
                <div onClick={() => setSubTab('PENDING')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-amber-200 transition-colors">
                  <p className="text-gray-400 text-[10px] uppercase font-bold">รอตรวจสอบ</p>
                  <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
                </div>
                <div onClick={() => setShowUserMgmt(true)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors flex flex-col justify-center items-center gap-1 text-indigo-500">
                  <span className="text-2xl">👥</span><span className="text-xs font-bold">จัดการสมาชิก</span>
                </div>
                <div onClick={() => setShowForm(true)} className="col-span-2 md:col-span-2 bg-indigo-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer flex items-center justify-between hover:bg-indigo-700 transition-all">
                  <div><p className="font-bold">บันทึกรายรับ</p><p className="text-indigo-200 text-xs">สร้างรายการด้วยตัวเอง</p></div><PlusCircle size={28} />
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-gray-50 flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
              {isAdmin && (
                <>
                  <button onClick={() => setSubTab('PENDING')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>รออนุมัติ ({pendingCount})</button>
                  <button onClick={() => setSubTab('MONTHLY')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab === 'MONTHLY' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>ตารางจ่ายเงิน</button>
                </>
              )}
              <button onClick={() => setSubTab('HISTORY')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab === 'HISTORY' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>ประวัติ</button>
              <button onClick={() => setSubTab('INDIVIDUAL')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subTab === 'INDIVIDUAL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>รายคน</button>

              {isAdmin && subTab === 'MONTHLY' && (
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setShowAddPeriod(true)} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold">+ รอบ</button>
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

      {/* MOBILE ACTION SHEET */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col justify-end animate-fade-in" onClick={() => setSelectedTx(null)}>
          <div className="bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-gray-800">จัดการรายการ</h3>
                <p className="text-sm text-gray-500">{selectedTx.studentName} - {selectedTx.amount} บาท</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
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
                  <button onClick={handleMobileReject} className="py-3 bg-red-100 text-red-600 rounded-xl font-bold flex justify-center items-center gap-2 active:scale-95 transition-transform"><X size={18} /> ไม่อนุมัติ</button>
                  <button onClick={handleMobileApprove} className="py-3 bg-green-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform"><CheckCircle size={18} /> อนุมัติ</button>
                </>
              )}
              <button onClick={handleMobileEdit} className="col-span-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-200"><PlusCircle size={18} /> แก้ไขข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {showAddPeriod && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="font-bold mb-4">เพิ่มรอบการเก็บเงิน</h3>
            <input autoFocus value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)} className="w-full border p-2 rounded-xl mb-4" placeholder="ชื่อรอบ" />
            <div className="flex gap-2"><button onClick={() => setShowAddPeriod(false)} className="flex-1 py-2 text-gray-500">ยกเลิก</button><button onClick={handleAddPeriod} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl">เพิ่ม</button></div>
          </div>
        </div>
      )}

      {showForm && (<TransactionForm classroom={currentClassroom} userRole={user.role} currentUserId={user._id} currentUserName={user.name} users={users} defaultValues={formDefaults} onSubmit={handleAddTransaction} onCancel={() => { setShowForm(false); setFormDefaults(undefined); }} />)}
      {showUserMgmt && <UserManagement onClose={() => { setShowUserMgmt(false); refreshData(); }} />}

      <a
        href="https://m.me/peerawit.yamsakol.2025"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 left-3 z-50 flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
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

      {user && !isAdmin && !(user as any).lineUserId && (<ConnectLine currentUser={user} onLinkSuccess={() => window.location.reload()} />)}
    </div>
  );
};

export default Dashboard;