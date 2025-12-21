
import React, { useState } from 'react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface Props {
  transactions: Transaction[];
  isAdmin: boolean;
  onStatusChange: (txId: string, status: TransactionStatus) => void;
  filter: 'ALL' | 'PENDING' | 'APPROVED';
}

const TransactionList: React.FC<Props> = ({ transactions, isAdmin, onStatusChange, filter }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter(t => {
    if (filter === 'PENDING') return t.status === TransactionStatus.PENDING;
    if (filter === 'APPROVED') return t.status === TransactionStatus.APPROVED || t.status === TransactionStatus.REJECTED;
    return true;
  });

  const handleAction = (status: TransactionStatus) => {
    if (reviewTx) {
        onStatusChange(reviewTx._id, status);
        setReviewTx(null);
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
        <p className="text-gray-500">ไม่มีรายการในส่วนนี้</p>
      </div>
    );
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
                 <button onClick={() => setReviewTx(tx)} className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition-all">ตรวจสอบรายละเอียด</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {reviewTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-gray-800 text-white p-4 flex justify-between items-center"><h3 className="font-bold">ตรวจสอบรายการ</h3><button onClick={() => setReviewTx(null)} className="text-2xl">&times;</button></div>
              <div className="p-6 overflow-y-auto flex-1 text-center">
                  <div className="text-4xl font-mono font-bold text-gray-800 mb-6">{reviewTx.amount.toLocaleString()} ฿</div>
                  {reviewTx.slipImage ? (<img src={reviewTx.slipImage} alt="Slip" className="w-full rounded-lg border" />) : (<div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">ไม่มีรูปภาพแนบ</div>)}
              </div>
              <div className="p-4 bg-gray-50 border-t grid grid-cols-2 gap-3">
                  <button onClick={() => handleAction(TransactionStatus.REJECTED)} className="py-3 rounded-xl font-bold text-rose-600 bg-rose-100">ปฏิเสธ</button>
                  <button onClick={() => handleAction(TransactionStatus.APPROVED)} className="py-3 rounded-xl font-bold text-white bg-emerald-600">อนุมัติ</button>
              </div>
           </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="Slip" className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
};

export default TransactionList;
