import React, { useState, useRef, useEffect } from 'react';
import { Transaction, TransactionType, TransactionStatus, UserRole, User, Classroom } from '../types';
import { analyzeSlip, SlipAnalysisResult } from '../services/geminiService';
import * as api from '../services/apiService';
import { Search, ChevronDown, Check } from 'lucide-react'; // ✅ เพิ่ม import ไอคอน

// ----------------------------------------------------------------------
// 🔥 COMPONENT: Dropdown ค้นหาได้ (Searchable Select)
// ----------------------------------------------------------------------
interface Option { label: string; value: string; }

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "เลือกรายการ...",
  disabled = false
}: { 
  options: Option[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // กรองรายการตามคำค้นหา
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => o.value === value)?.label;

  // ปิดเมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // เมื่อเลือกรายการ
  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* ปุ่มกดเปิด Dropdown */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 border rounded-xl flex justify-between items-center bg-white transition-all
            ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'cursor-pointer hover:border-indigo-400'}
            ${isOpen ? 'ring-2 ring-indigo-200 border-indigo-400' : 'border-gray-200'}
        `}
      >
        <span className={`text-sm ${selectedLabel ? "text-gray-800 font-medium" : "text-gray-400"}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* กล่องรายชื่อ (โผล่มาเมื่อกดเปิด) */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-fade-in-up">
            {/* ช่องค้นหา (Sticky) */}
            <div className="p-2 border-b border-gray-50 bg-gray-50/50 sticky top-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                        autoFocus
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-400 placeholder:text-gray-300"
                        placeholder="พิมพ์เพื่อค้นหา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* รายการตัวเลือก */}
            <div className="max-h-60 overflow-y-auto">
                {filtered.length > 0 ? (
                    filtered.map(opt => (
                        <div 
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`px-4 py-3 text-sm cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center
                                ${value === opt.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-gray-50'}`}
                        >
                            <span>{opt.label}</span>
                            {value === opt.value && <Check size={14} />}
                        </div>
                    ))
                ) : (
                    <div className="p-4 text-center text-xs text-gray-400">ไม่พบข้อมูล "{search}"</div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

interface Props {
  classroom: Classroom;
  userRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  users: User[];
  defaultValues?: Partial<Transaction>;
  onSubmit: (tx1: any, tx2?: any) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<Props> = ({ classroom, userRole, currentUserId, currentUserName, users, defaultValues, onSubmit, onCancel }) => {
  const [type, setType] = useState<TransactionType>(defaultValues?.type || TransactionType.DEPOSIT);
  const [note, setNote] = useState(defaultValues?.note || '');
  
  // State
  const [period1, setPeriod1] = useState(defaultValues?.period || '');
  const [amount1, setAmount1] = useState(defaultValues?.amount?.toString() || '');
  
  const [period2, setPeriod2] = useState('');
  const [amount2, setAmount2] = useState('');

  // ยอดรวม
  const [totalAmount, setTotalAmount] = useState(0);

  // Popup States
  const [showIntroWarning, setShowIntroWarning] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [studentName, setStudentName] = useState(defaultValues?.studentName || currentUserName);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(defaultValues?.userId || (userRole === UserRole.STUDENT ? currentUserId : undefined));
  
  const [slipImage, setSlipImage] = useState<string | undefined>(undefined);
  const [slipHash, setSlipHash] = useState<string>('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiResult, setAiResult] = useState<SlipAnalysisResult | null>(null);
  const [error, setError] = useState(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === UserRole.ADMIN;
  const isStudent = userRole === UserRole.STUDENT;
  const studentsOnly = users.filter(u => u.role === UserRole.STUDENT);

  // เตรียมข้อมูลสำหรับ SearchableSelect
  const studentOptions = [
      { label: '🏛️ ส่วนกลาง (ยอดเงินรวม)', value: 'GENERAL' },
      ...studentsOnly.map(s => ({ label: s.name, value: s._id }))
  ];

  // คำนวณยอดรวม
  useEffect(() => {
    if (isAdmin) {
        const v1 = parseFloat(amount1) || 0;
        const v2 = parseFloat(amount2) || 0;
        setTotalAmount(v1 + v2);
    } else {
        setTotalAmount(parseFloat(amount1) || 0);
    }
  }, [amount1, amount2, isAdmin]);

  // Auto-fill ราคา (เฉพาะ Admin)
  useEffect(() => {
    if (isAdmin && period1 && classroom.periodAmounts?.[period1] && !amount1) {
       setAmount1(classroom.periodAmounts[period1].toString());
    }
  }, [period1, isAdmin]);

  useEffect(() => {
    if (isAdmin && period2 && classroom.periodAmounts?.[period2] && !amount2) {
       setAmount2(classroom.periodAmounts[period2].toString());
    }
  }, [period2, isAdmin]);

  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. เช็คสลิปซ้ำ
      const hash = await computeSHA256(file);
      setSlipHash(hash);
      
      try {
        const check = await api.checkSlipDuplicate(hash); 
        if (check.isDuplicate) {
           setError('⚠️ รูปสลิปนี้เคยถูกใช้งานในระบบแล้ว');
           setSlipImage(undefined);
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
        }
      } catch (err) {}

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // ถ้าเป็นรายจ่าย ไม่ต้องใช้ AI ตรวจ
        if (type === TransactionType.EXPENSE) {
            setSlipImage(base64);
            return;
        }
        
        setIsAnalyzing(true);
        setAiResult(null);
            
        try {
            const result = await analyzeSlip(base64);
            
            if (result.isValid) {
                setSlipImage(base64);
                if (result.amount) {
                    setAmount1(result.amount.toString());
                }
                setAiResult(result);
                setError('');
            } else {
                alert(`⛔️ ไม่สามารถใช้รูปนี้ได้\n\nเหตุผล: ${result.message || "ไม่ใช่สลิปโอนเงิน หรือข้อมูลไม่ชัดเจน"}`);
                setSlipImage(undefined);
                setSlipHash('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert("ระบบ AI ขัดข้องชั่วคราว (คุณสามารถกรอกยอดเงินเองได้)");
            setSlipImage(base64);
        } finally {
            setIsAnalyzing(false);
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

  const handleQuickTagClick = (tagName: string) => {
      setNote(tagName); 
      if (classroom.periodAmounts && classroom.periodAmounts[tagName]) {
          setAmount1(classroom.periodAmounts[tagName].toString());
      }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (totalAmount <= 0) {
        setError('ยอดเงินรวมต้องมากกว่า 0');
        return;
    }

    if (isStudent && type === TransactionType.DEPOSIT && !slipImage) {
        setError('กรุณาแนบสลิป/หลักฐานการโอนเงินที่ถูกต้อง');
        return;
    }

    if (!isAdmin && !note.trim()) {
        setError('กรุณาระบุหมายเหตุ (สามารถกดเลือกจากปุ่มด้านล่างได้)');
        return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSaving(true);
    setShowConfirmModal(false);

    const finalPeriod1 = isAdmin ? (period1 || undefined) : "รอตรวจสอบ";

    const tx1: any = { 
      classroomId: classroom.id,
      type,
      amount: parseFloat(amount1) || 0,
      studentName, 
      userId: targetUserId === 'GENERAL' ? undefined : targetUserId,
      note,
      period: finalPeriod1,
      date: new Date().toISOString(),
      status: isAdmin ? TransactionStatus.APPROVED : TransactionStatus.PENDING,
      slipImage, 
      slipHash,
      approver: isAdmin ? currentUserName : undefined
    };

    let tx2 = undefined;
    if (isAdmin) {
        const v2 = parseFloat(amount2) || 0;
        if (period2 && v2 > 0) {
            tx2 = { 
                ...tx1, 
                amount: v2, 
                period: period2, 
                note: note ? `${note} (2)` : '' 
            };
        }
    }
    
    try {
        await onSubmit(tx1, tx2);
    } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาด');
        setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto relative">
          
          <div className={`p-4 text-white flex justify-between items-center ${type === TransactionType.DEPOSIT ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <h2 className="text-lg font-bold">{isSaving ? 'กำลังบันทึก...' : (isAdmin ? 'บันทึกรายการเงิน' : 'ชำระเงิน / แจ้งโอน')}</h2>
            <button onClick={onCancel} disabled={isSaving} className="text-white/70 hover:text-white text-3xl leading-none">&times;</button>
          </div>
          
          {showIntroWarning ? (
            <div className="p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">ข้อควรระวังก่อนเริ่ม!</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                   กรุณาระบุยอดเงินในช่องกรอกข้อมูล<br/>
                   ให้ <span className="text-rose-600 font-bold underline bg-rose-50 px-1 rounded">ตรงกับยอดจริง</span> เท่านั้น
                </p>
                <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-500 mb-6 text-left border border-gray-100">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>ห้ามกรอกยอดที่หารเฉลี่ยเอง</li>
                        <li>ระบบจะตรวจสอบยอดเงินอัตโนมัติ (สำหรับนักเรียน)</li>
                        <li>Admin สามารถบันทึกยอดได้โดยไม่ต้องมีสลิป</li>
                    </ul>
                </div>
                <button onClick={() => setShowIntroWarning(false)} className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95">
                   รับทราบ / เริ่มทำรายการ
                </button>
            </div>
          ) : (
            <form onSubmit={handlePreSubmit} className="p-6 space-y-4 animate-fade-in">
              
              {type === TransactionType.DEPOSIT && classroom.paymentQrCode && !isSaving && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center">
                   <p className="text-[10px] font-bold text-orange-600 uppercase mb-2">Scan to Pay</p>
                   <img src={classroom.paymentQrCode} className="w-40 h-40 object-contain bg-white p-2 rounded-lg shadow-sm" alt="Payment QR" />
                </div>
              )}

              {isAdmin && !isSaving && (
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setType(TransactionType.DEPOSIT)} className={`flex-1 py-2 rounded-md text-sm font-bold ${type === TransactionType.DEPOSIT ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>รายรับ</button>
                  <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-2 rounded-md text-sm font-bold ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>รายจ่าย</button>
                </div>
              )}

               <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase ml-1">ผู้ทำรายการ</label>
                {isAdmin ? (
                  /* ✅ เปลี่ยนตรงนี้: ใช้ SearchableSelect แทน select เดิม */
                  <SearchableSelect 
                    options={studentOptions}
                    value={targetUserId || ''}
                    onChange={handleStudentSelect}
                    placeholder="-- พิมพ์ชื่อเพื่อค้นหา --"
                    disabled={isSaving}
                  />
                ) : (
                  <input disabled type="text" value={studentName} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600" />
                )}
              </div>

              {/* --- สลิป --- */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase ml-1">
                    หลักฐาน/สลิป {isAdmin && <span className="font-normal text-gray-400">(ถ้ามี)</span>}
                </label>
                
                <div onClick={() => !isAnalyzing && !isSaving && fileInputRef.current?.click()} className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden ${slipImage ? 'border-emerald-200' : 'border-gray-200 hover:border-indigo-400'} transition-all`}>
                  
                  {slipImage ? <img src={slipImage} className="h-full w-full object-contain" /> : <div className="text-center text-gray-400"><span className="text-3xl block mb-2">+</span><span className="text-xs">คลิกเพื่ออัปโหลด</span></div>}
                  
                  {isAnalyzing && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                          <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-2"></div>
                          <span className="text-xs font-bold text-emerald-600 animate-pulse">AI กำลังตรวจสอบยอด...</span>
                      </div>
                  )}

                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                {aiResult && aiResult.isValid && !isAnalyzing && <p className="text-[10px] text-emerald-600 font-bold mt-1 text-center animate-fade-in-up">✓ AI ตรวจสอบยอด: {aiResult.amount} ฿</p>}
              </div>

              {/* ยอดเงิน */}
              {isAdmin ? (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                     <div className="grid grid-cols-[1.5fr,1fr] gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">รายการ (1)</label>
                          <select disabled={isSaving} value={period1} onChange={(e) => setPeriod1(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">-- เลือกรายการ --</option>
                            {classroom.activePeriods?.map(p => (<option key={p} value={p}>{p}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">จำนวนเงิน (1)</label>
                          <input type="number" step="0.01" value={amount1} onChange={(e) => setAmount1(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0.00" />
                        </div>
                     </div>

                     <div className="grid grid-cols-[1.5fr,1fr] gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">รายการ (2)</label>
                          <select disabled={isSaving} value={period2} onChange={(e) => setPeriod2(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">-- เลือกรายการเสริม --</option>
                            {classroom.activePeriods?.filter(p => p !== period1).map(p => (<option key={p} value={p}>{p}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">จำนวนเงิน (2)</label>
                          <input type="number" step="0.01" value={amount2} onChange={(e) => setAmount2(e.target.value)} disabled={!period2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100" placeholder="0.00" />
                        </div>
                     </div>
                  </div>
              ) : (
                  <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase ml-1">ยอดเงินที่โอน (บาท)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={amount1} 
                        onChange={(e) => setAmount1(e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-gray-300 transition-all" 
                        placeholder="ระบุยอดเงินตามสลิป" 
                      />
                  </div>
              )}

              {isAdmin && (
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                     <span className="text-sm font-bold text-indigo-800">ยอดรวมสุทธิ</span>
                     <span className="text-2xl font-mono font-bold text-indigo-600">{totalAmount.toLocaleString()} ฿</span>
                  </div>
              )}

              {error && <div className="bg-rose-50 p-3 rounded-xl"><p className="text-rose-600 text-xs font-bold">{error}</p></div>}

              {/* --- หมายเหตุ & Quick Tags --- */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase ml-1">
                    หมายเหตุ {!isAdmin && <span className="text-rose-500">*</span>}
                </label>
                <textarea 
                    disabled={isSaving} 
                    rows={2} 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${!note && !isAdmin ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gray-200'}`} 
                    placeholder="เช่น ค่าเสื้อ, ค่าห้องเดือน ส.ค." 
                />
                
                {!isAdmin && classroom.activePeriods && classroom.activePeriods.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {classroom.activePeriods.map(p => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => handleQuickTagClick(p)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-full transition-colors flex items-center gap-1 active:scale-95"
                            >
                                <span>+ {p}</span>
                                {classroom.periodAmounts?.[p] && (
                                    <span className="text-gray-400 font-normal">
                                        ({classroom.periodAmounts[p]}.-)
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
              </div>

              <button type="submit" disabled={isAnalyzing || isSaving} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${type === TransactionType.DEPOSIT ? 'bg-emerald-600' : 'bg-rose-600'} disabled:opacity-50`}>
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* --- CONFIRM POPUP --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-[60] backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-bounce-in">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-emerald-600">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-2">ตรวจสอบความถูกต้อง</h3>
              <p className="text-gray-500 text-sm mb-6">คุณยืนยันที่จะบันทึกยอดเงินนี้ใช่หรือไม่?</p>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 text-left space-y-2">
                 <div className="flex justify-between text-sm"><span>ยอดเงิน:</span> <span className="font-bold text-emerald-600">{totalAmount.toLocaleString()} ฿</span></div>
                 <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                    <span className="font-bold">หมายเหตุ:</span> {note}
                 </div>
                 <div className="text-xs text-gray-400 mt-1">
                    <span className="font-bold">สลิป:</span> {slipImage ? 'แนบแล้ว' : 'ไม่ได้แนบ'}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowConfirmModal(false)} className="py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                    แก้ไข
                 </button>
                 <button onClick={handleConfirmSubmit} className="py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-colors">
                    ยืนยันบันทึก
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default TransactionForm;