import React, { useState, useRef, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus, UserRole, User, Classroom } from '../types';
import { analyzeSlip, SlipAnalysisResult } from '../services/geminiService';
import * as api from '../services/apiService'; // import api เพื่อใช้เช็กซ้ำ

interface Props {
  classroom: Classroom;
  userRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  users: User[];
  defaultValues?: Partial<Transaction>;
  onSubmit: (tx: Transaction) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<Props> = ({ classroom, userRole, currentUserId, currentUserName, users, defaultValues, onSubmit, onCancel }) => {
  const [type, setType] = useState<TransactionType>(defaultValues?.type || TransactionType.DEPOSIT);
  const [amount, setAmount] = useState(defaultValues?.amount?.toString() || '');
  const [note, setNote] = useState(defaultValues?.note || '');
  const [period, setPeriod] = useState(defaultValues?.period || '');
  const [studentName, setStudentName] = useState(defaultValues?.studentName || currentUserName);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(defaultValues?.userId || (userRole === UserRole.STUDENT ? currentUserId : undefined));
  const [slipImage, setSlipImage] = useState<string | undefined>(undefined);
  const [slipHash, setSlipHash] = useState<string>(''); // state สำหรับเก็บ hash
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<SlipAnalysisResult | null>(null);
  const [error, setError] = useState(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === UserRole.ADMIN;
  const isStudent = userRole === UserRole.STUDENT;
  const studentsOnly = users.filter(u => u.role === UserRole.STUDENT);

  // ฟังก์ชันคำนวณ Hash ของไฟล์ (เปรียบเสมือนลายนิ้วมือของรูป)
  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. คำนวณ Hash และเช็กซ้ำทันที
      const hash = await computeSHA256(file);
      setSlipHash(hash);
      
      try {
        // เรียก API เช็กว่า Hash นี้เคยมีในระบบไหม (ต้องเพิ่ม API นี้ใน service)
        const check = await api.checkSlipDuplicate(hash); 
        if (check.isDuplicate) {
           setError('⚠️ รูปสลิปนี้เคยถูกใช้งานในระบบแล้ว กรุณาตรวจสอบ');
           setSlipImage(undefined); // เคลียร์รูปออก
           if (fileInputRef.current) fileInputRef.current.value = '';
           return; // จบการทำงาน ไม่ไปต่อ
        }
      } catch (err) {
        console.warn("Skipping duplicate check due to error/offline");
      }

      // 2. ถ้าไม่ซ้ำ ก็ทำงานต่อตามปกติ
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setSlipImage(base64);
        setError('');
        
        if (type === TransactionType.DEPOSIT) {
            setIsAnalyzing(true);
            setAiResult(null);
            const result = await analyzeSlip(base64);
            setIsAnalyzing(false);
            setAiResult(result);
            if (result.isValid && result.amount) setAmount(result.amount.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStudentSelect = (userId: string) => {
    setTargetUserId(userId);
    if (userId === 'GENERAL') {
      setStudentName('รายการส่วนกลาง');
    } else {
      const selected = users.find(u => u._id === userId);
      if (selected) setStudentName(selected.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isSaving) return;

    if (isStudent) {
        if (!period) {
            setError('กรุณาเลือกรอบการเก็บเงินที่คุณต้องการชำระ');
            return;
        }
        if (type === TransactionType.DEPOSIT && !slipImage) {
            setError('กรุณาแนบสลิป/หลักฐานการโอนเงิน');
            return;
        }
    }

    setIsSaving(true);
    // เพิ่ม slipHash เข้าไปใน object transaction (ต้องแก้ Interface Transaction ด้วยถ้าต้องการ Type safe)
    const newTx: any = { 
      classroomId: classroom.id,
      type,
      amount: parseFloat(amount),
      studentName, 
      userId: targetUserId === 'GENERAL' ? undefined : targetUserId,
      note,
      period: period || undefined,
      date: new Date().toISOString(),
      status: isAdmin ? TransactionStatus.APPROVED : TransactionStatus.PENDING,
      slipImage,
      slipHash, // ส่ง hash ไปบันทึกด้วย
      approver: isAdmin ? currentUserName : undefined
    };
    
    try {
        await onSubmit(newTx);
    } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่');
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className={`p-4 text-white flex justify-between items-center transition-colors duration-500 sticky top-0 z-10 ${type === TransactionType.DEPOSIT ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-2">
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <h2 className="text-lg font-bold">{isSaving ? 'กำลังบันทึกข้อมูล...' : (isAdmin ? 'บันทึกรายการเงิน' : 'ชำระเงิน / แจ้งโอน')}</h2>
          </div>
          <button 
            onClick={onCancel} 
            disabled={isSaving}
            className="text-white/70 hover:text-white hover:rotate-90 transition-all duration-200 text-3xl leading-none focus:outline-none"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ... (ส่วนอื่นๆ เหมือนเดิม) ... */}
          
          {/* ส่วนแสดง QR Code (คงเดิม) */}
          {type === TransactionType.DEPOSIT && classroom.paymentQrCode && !isSaving && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center group transition-all duration-300 hover:shadow-inner">
               <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Scan to Pay (TrueMoney/PromptPay)</p>
               <div className="relative overflow-hidden rounded-lg shadow-sm bg-white p-2">
                 <img src={classroom.paymentQrCode} className="w-40 h-40 object-contain transition-transform duration-500 group-hover:scale-105" alt="Payment QR" />
               </div>
               <p className="text-[10px] text-orange-400 mt-2">สแกนจ่ายแล้วแนบสลิปด้านล่าง</p>
            </div>
          )}

          {/* ... (ส่วนเลือกผู้ทำรายการ / จำนวนเงิน คงเดิม) ... */}
          {isAdmin && !isSaving && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button type="button" onClick={() => setType(TransactionType.DEPOSIT)} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${type === TransactionType.DEPOSIT ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-emerald-500/70'}`}>รายรับ</button>
              <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all duration-200 ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-rose-500/70'}`}>รายจ่าย</button>
            </div>
          )}

           <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">ผู้ทำรายการ</label>
            {isAdmin ? (
              <select required disabled={isSaving} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white text-gray-700 disabled:bg-gray-50" value={targetUserId || ''} onChange={(e) => handleStudentSelect(e.target.value)}>
                <option value="">-- เลือกชื่อนักเรียน --</option>
                <option value="GENERAL">ส่วนกลาง (ยอดเงินรวม)</option>
                {studentsOnly.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            ) : (
              <input disabled type="text" value={studentName} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">จำนวนเงิน (฿)</label>
              <input required disabled={isSaving} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none disabled:bg-gray-50" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">รอบการเก็บเงิน</label>
              <select required={isStudent} disabled={isSaving} value={period} onChange={(e) => { setPeriod(e.target.value); setError(''); }} className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none disabled:bg-gray-50 ${error && !period && isStudent ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}>
                <option value="">{isStudent ? '-- กรุณาเลือก --' : 'ไม่ระบุ'}</option>
                {classroom.activePeriods?.map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">หลักฐาน/สลิป {isStudent && type === TransactionType.DEPOSIT && <span className="text-red-500">*</span>}</label>
            <div 
              onClick={() => !isAnalyzing && !isSaving && fileInputRef.current?.click()} 
              className={`group w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden relative ${slipImage ? 'border-emerald-200' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <span className="text-[10px] text-emerald-600 font-bold animate-pulse">AI กำลังวิเคราะห์สลิป...</span>
                </div>
              ) : slipImage ? (
                <div className="relative w-full h-full">
                  <img src={slipImage} className="h-full w-full object-contain" />
                  {!isSaving && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm">เปลี่ยนรูปภาพ</span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-300 mb-2 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-500 uppercase tracking-widest">คลิกเพื่ออัปโหลดรูปภาพ</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {aiResult && aiResult.isValid && (
              <div className="mt-1 flex items-center gap-1.5 animate-fade-in">
                <span className="text-emerald-500 text-xs">✓</span>
                <p className="text-[10px] text-emerald-600 font-bold">AI ตรวจสอบสลิปเรียบร้อย ({aiResult.amount} ฿)</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl animate-shake">
              <p className="text-rose-600 text-[10px] font-bold flex items-center gap-2">
                <span className="text-xs">⚠️</span> {error}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">หมายเหตุ</label>
            <textarea disabled={isSaving} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none disabled:bg-gray-50" placeholder="เช่น ค่าห้องเดือน ส.ค." />
          </div>

          <button type="submit" disabled={isAnalyzing || isSaving} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden group ${type === TransactionType.DEPOSIT ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-200'} ${(isAnalyzing || isSaving) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98] hover:-translate-y-0.5'}`}>
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSaving ? 'กำลังอัปโหลดและบันทึก...' : (isAdmin ? 'บันทึกรายการทันที' : 'แจ้งฝากเงิน')}
              {!isSaving && <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;