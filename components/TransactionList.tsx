import React, { useState, useEffect } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  isAdmin: boolean;
  periods?: string[]; 
  onStatusChange: (txId: string, status: TransactionStatus, p1: string, a1: number, p2?: string, a2?: number) => void;
  filter: 'ALL' | 'PENDING' | 'APPROVED';
}

const TransactionList: React.FC<Props> = ({ transactions, isAdmin, onStatusChange, filter, periods = [] }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  
  const [period1, setPeriod1] = useState('');
  const [amount1, setAmount1] = useState('');
  
  const [period2, setPeriod2] = useState('');
  const [amount2, setAmount2] = useState('');

  const [totalDisplay, setTotalDisplay] = useState(0);

  useEffect(() => {
     const v1 = parseFloat(amount1) || 0;
     const v2 = parseFloat(amount2) || 0;
     setTotalDisplay(v1 + v2);
  }, [amount1, amount2]);

  const filtered = transactions.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return t.status === TransactionStatus.PENDING;
    if (filter === 'APPROVED') return t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.REJECTED;
    return true;
  });

  const sortedTransactions = [...filtered].sort((a, b) => {
      if (a.status === TransactionStatus.PENDING && b.status !== TransactionStatus.PENDING) return -1;
      if (a.status !== TransactionStatus.PENDING && b.status === TransactionStatus.PENDING) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  const openReview = (tx: Transaction) => {
      setReviewTx(tx);
      setIsConfirmingReject(false);

      let p1 = '';
      let p2 = '';
      let rawP1 = '';

      // 1. ลองดึงข้อมูลเดิมออกมาดูก่อน
      if (tx.period) {
          const parts = tx.period.split(',').map(s => s.trim());
          rawP1 = parts[0] || '';
          if (parts.length > 1) p2 = parts[1]; // จำ p2 เดิมไว้ก่อน
      }

      // 2. เช็คว่าข้อมูลเดิม (rawP1) ยังใช้ได้จริงไหม?
      if (rawP1 && periods.includes(rawP1)) {
          p1 = rawP1; 
      }

      // 3. ถ้ายังไม่ได้ p1 -> ให้ระบบเดาจากหมายเหตุ (Smart Auto-Select)
      if (!p1 && tx.note) {
          const cleanNote = normalize(tx.note);
          
          const foundPeriods = periods.filter(p => {
             const cleanPeriod = normalize(p);
             return cleanNote.includes(cleanPeriod);
          });

          // เลือกตัวแรกที่เจอ (ตามลำดับใน periods)
          if (foundPeriods.length > 0) {
             p1 = foundPeriods[0];
             
             // ถ้าเจอมากกว่า 1 ตัว และ p2 ยังว่าง ให้ใส่ p2 ด้วยเลย
             if (foundPeriods.length > 1 && (!p2 || !periods.includes(p2))) {
                 p2 = foundPeriods[1];
             }
          }
      }

      // 4. (กันเหนียว) ตรวจสอบครั้งสุดท้าย ถ้า p1 ไม่มีในระบบ ต้องล้างทิ้ง
      if (p1 && !periods.includes(p1)) {
          p1 = '';
      }
      if (p2 && !periods.includes(p2)) {
          p2 = '';
      }

      setPeriod1(p1);
      setPeriod2(p2);
      setAmount1(tx.amount.toString()); 
      setAmount2(''); 
  };

  const closeReview = () => {
    setReviewTx(null);
    setIsConfirmingReject(false);
    setPeriod1(''); setPeriod2('');
    setAmount1(''); setAmount2('');
  };

  const handleAction = (status: TransactionStatus) => {
    if (reviewTx) {
        if (status === TransactionStatus.APPROVED && (!period1 || period1.trim() === '')) {
            alert('⛔️ ไม่สามารถบันทึกได้!\nกรุณาเลือก "รอบที่ 1 (หลัก)" ให้ถูกต้องก่อนครับ');
            return;
        }
        
        const a1 = parseFloat(amount1) || 0;
        const a2 = parseFloat(amount2) || 0;

        if (status === TransactionStatus.APPROVED && (a1 + a2) <= 0) {
            alert('ยอดเงินรวมต้องมากกว่า 0');
            return;
        }

        onStatusChange(reviewTx._id!, status, period1, a1, period2, a2);
        closeReview();
    }
  };

  if (sortedTransactions.length === 0) {
    return <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-gray-500">ไม่มีรายการในส่วนนี้</p></div>;
  }

  const isFormValid = period1 && period1.trim() !== '' && periods.includes(period1);

  return (
    <>
      <div className="space-y-3">
        {sortedTransactions.map((tx) => (
          <div key={tx._id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 transition-all hover:shadow-md ${tx.status === TransactionStatus.PENDING ? 'border-amber-400' : tx.status === TransactionStatus.APPROVED ? 'border-emerald-500' : 'border-rose-500'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${tx.type === TransactionType.DEPOSIT ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{tx.type === TransactionType.DEPOSIT ? 'รายรับ' : 'รายจ่าย'}</span>
                  <span className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h3 className="font-semibold text-gray-800">{tx.studentName}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">{tx.note || '-'}</p>
                    {tx.period && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tx.period}</span>}
                    {tx.slipImage && tx.status !== TransactionStatus.PENDING && (
                        <button onClick={() => setPreviewImage(tx.slipImage!)} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100">สลิป</button>
                    )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold font-mono ${tx.type === TransactionType.DEPOSIT ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === TransactionType.DEPOSIT ? '+' : '-'}{tx.amount.toLocaleString()} ฿</div>
                <div className="text-xs font-medium mt-1">
                   {tx.status === TransactionStatus.PENDING && <span className="text-amber-500">รอตรวจสอบ</span>}
                   {tx.status === TransactionStatus.APPROVED && <span className="text-emerald-500">อนุมัติแล้ว</span>}
                   {tx.status === TransactionStatus.REJECTED && <span className="text-rose-500">ปฏิเสธ</span>}
                </div>
              </div>
            </div>
            {isAdmin && tx.status === TransactionStatus.PENDING && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                 <button onClick={() => openReview(tx)} className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition-all">ตรวจสอบรายละเอียด</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {reviewTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-gray-800 text-white p-4 flex justify-between items-center"><h3 className="font-bold">ตรวจสอบและระบุยอดเงิน</h3><button onClick={closeReview} className="text-2xl">&times;</button></div>
              <div className="p-6 overflow-y-auto flex-1 text-center">
                  
                  <div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                     <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">ยอดเงินรวมสุทธิ</label>
                     <div className="text-4xl font-mono font-bold text-emerald-600">{totalDisplay.toLocaleString()} ฿</div>
                  </div>

                  {reviewTx.note && (
                    <div className="mb-6 bg-amber-50 p-3 rounded-xl border border-amber-100 text-left">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-lg">📝</span>
                             <label className="text-[10px] font-bold text-amber-800 uppercase">หมายเหตุ / บันทึกช่วยจำ</label>
                        </div>
                        <p className="text-sm text-gray-700 font-medium pl-1">{reviewTx.note}</p>
                    </div>
                  )}
                  
                  <div className="mb-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                     <div className="grid grid-cols-[1.5fr,1fr] gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">รอบที่ 1 (หลัก) <span className="text-red-500 text-sm">*</span></label>
                            <select 
                                value={period1} 
                                onChange={(e) => setPeriod1(e.target.value)} 
                                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${!isFormValid ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}
                            >
                                <option value="">-- กรุณาเลือก --</option>
                                {periods.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            {!isFormValid && <p className="text-[10px] text-amber-600 mt-1">* จำเป็นต้องเลือก</p>}
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ยอดเงิน (1)</label>
                             <input type="number" value={amount1} onChange={(e) => setAmount1(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-right text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
                        </div>
                     </div>

                     <div className="grid grid-cols-[1.5fr,1fr] gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">รอบที่ 2 (ถ้ามี)</label>
                            <select value={period2} onChange={(e) => setPeriod2(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- ไม่ระบุ --</option>
                                {periods.filter(p => p !== period1).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ยอดเงิน (2)</label>
                             <input type="number" value={amount2} onChange={(e) => setAmount2(e.target.value)} disabled={!period2} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-right text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100" placeholder="0.00" />
                        </div>
                     </div>
                  </div>

                  {reviewTx.slipImage ? (<img src={reviewTx.slipImage} alt="Slip" className="w-full rounded-lg border" />) : (<div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">ไม่มีรูปภาพแนบ</div>)}
              </div>
              <div className="p-4 bg-gray-50 border-t grid grid-cols-2 gap-3">
                  <button onClick={() => setIsConfirmingReject(true)} className="py-3 rounded-xl font-bold text-rose-600 bg-rose-100 hover:bg-rose-200">ปฏิเสธ</button>
                  <button 
                    onClick={() => handleAction(TransactionStatus.APPROVED)} 
                    disabled={!isFormValid}
                    className={`py-3 rounded-xl font-bold text-white shadow-lg transition-all ${isFormValid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed text-gray-500'}`}
                  >
                    อนุมัติ (บันทึกแยกยอด)
                  </button>
              </div>
              {isConfirmingReject && (
                 <div className="absolute inset-x-0 bottom-0 bg-white p-4 border-t shadow-lg animate-fade-in-up text-center">
                    <p className="text-rose-600 font-bold mb-3">ยืนยันการปฏิเสธ?</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setIsConfirmingReject(false)} className="px-6 py-2 bg-gray-100 rounded-lg">ยกเลิก</button>
                        <button onClick={() => handleAction(TransactionStatus.REJECTED)} className="px-6 py-2 bg-rose-600 text-white rounded-lg">ยืนยัน</button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {previewImage && <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}><img src={previewImage} className="max-h-[90vh] rounded-lg" /></div>}
    </>
  );
};

export default TransactionList;