import React, { useState, useEffect } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  isAdmin: boolean;
  periods?: string[]; 
  // แก้ไข: เปลี่ยน Signature เพื่อส่งค่าแยก 2 ก้อน
  onStatusChange: (txId: string, status: TransactionStatus, p1: string, a1: number, p2?: string, a2?: number) => void;
  filter: 'ALL' | 'PENDING' | 'APPROVED';
}

const TransactionList: React.FC<Props> = ({ transactions, isAdmin, onStatusChange, filter, periods = [] }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  
  // State แยกยอด 2 รายการ
  const [period1, setPeriod1] = useState('');
  const [amount1, setAmount1] = useState('');
  
  const [period2, setPeriod2] = useState('');
  const [amount2, setAmount2] = useState('');

  // ยอดรวม (ไว้โชว์เช็คความถูกต้อง)
  const [totalDisplay, setTotalDisplay] = useState(0);

  useEffect(() => {
     const v1 = parseFloat(amount1) || 0;
     const v2 = parseFloat(amount2) || 0;
     setTotalDisplay(v1 + v2);
  }, [amount1, amount2]);

  const filtered = transactions.filter(t => {
    if (filter === 'PENDING') return t.status === TransactionStatus.PENDING;
    if (filter === 'APPROVED') return t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.REJECTED;
    return true;
  });

  const openReview = (tx: Transaction) => {
      setReviewTx(tx);
      setIsConfirmingReject(false);

      // แกะชื่อรอบจากที่ user ส่งมา (เช่น "Test1, Twst2")
      let p1 = '', p2 = '';
      if (tx.period) {
          const parts = tx.period.split(',').map(s => s.trim());
          p1 = parts[0] || '';
          p2 = parts[1] || '';
      }
      setPeriod1(p1);
      setPeriod2(p2);

      // ตั้งค่าเงินเริ่มต้นที่ช่อง 1 ก่อน ให้ Admin มาแบ่งเอง
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
        if (!period1) { alert('กรุณาเลือกรอบที่ 1'); return; }
        
        const a1 = parseFloat(amount1) || 0;
        const a2 = parseFloat(amount2) || 0;

        // ถ้าอนุมัติ ยอดรวมต้องไม่ติดลบ
        if (status === TransactionStatus.APPROVED && (a1 + a2) <= 0) {
            alert('ยอดเงินรวมต้องมากกว่า 0');
            return;
        }

        // ส่งข้อมูลแยก 2 ก้อนกลับไปที่ Dashboard
        onStatusChange(reviewTx._id, status, period1, a1, period2, a2);
        closeReview();
    }
  };

  if (filtered.length === 0) {
    return <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-gray-500">ไม่มีรายการในส่วนนี้</p></div>;
  }

  return (
    <>
      <div className="space-y-3">
        {filtered.map((tx) => (
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
                  
                  <div className="mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                     <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">ยอดเงินรวมสุทธิ</label>
                     <div className="text-4xl font-mono font-bold text-emerald-600">{totalDisplay.toLocaleString()} ฿</div>
                  </div>
                  
                  {/* --- ส่วนกรอกแยกยอด (สำคัญ) --- */}
                  <div className="mb-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                     {/* รายการที่ 1 */}
                     <div className="grid grid-cols-[1.5fr,1fr] gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">รอบที่ 1 (หลัก)</label>
                            <select value={period1} onChange={(e) => setPeriod1(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- เลือก --</option>
                                {periods.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ยอดเงิน (1)</label>
                             <input type="number" value={amount1} onChange={(e) => setAmount1(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-right text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
                        </div>
                     </div>

                     {/* รายการที่ 2 */}
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
                  <button onClick={() => handleAction(TransactionStatus.APPROVED)} className="py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg">อนุมัติ (บันทึกแยกยอด)</button>
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