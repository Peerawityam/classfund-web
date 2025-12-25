import React, { useState, useEffect, useRef } from 'react';
import { Classroom, Transaction, TransactionStatus, User, UserRole, TransactionType } from '../types';
import * as api from '../services/apiService';
import LoadingScreen from './LoadingScreen';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import UserManagement from './UserManagement';
import ConnectLine from './ConnectLine';
import * as XLSX from 'xlsx';

interface Props {
  classroom: Classroom;
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ classroom, user, onLogout }) => {
  const [currentClassroom, setCurrentClassroom] = useState<Classroom>(classroom);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [balance, setBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formDefaults, setFormDefaults] = useState<Partial<Transaction> | undefined>(undefined);
  const [showUserMgmt, setShowUserMgmt] = useState(false);

  const [newPeriodName, setNewPeriodName] = useState('');
  const [showAddPeriod, setShowAddPeriod] = useState(false);

  const [isEditingAnnounce, setIsEditingAnnounce] = useState(false);
  const [announceText, setAnnounceText] = useState('');

  const [tab, setTab] = useState<'PENDING' | 'HISTORY' | 'INDIVIDUAL' | 'MONTHLY'>('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user.role === UserRole.ADMIN;
  const periods = currentClassroom.activePeriods || [];

  useEffect(() => {
    refreshData();
  }, [user._id]);

  useEffect(() => {
    if (currentClassroom.announcement) {
      setAnnounceText(currentClassroom.announcement);
    }
  }, [currentClassroom]);

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
    try {
      await api.updateAnnouncement(currentClassroom._id, announceText);
      alert('บันทึกประกาศเรียบร้อย ✅');
      setIsEditingAnnounce(false);
      refreshData();
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึกประกาศ');
    }
  };

  // ✅ ฟังก์ชันกดปุ่มประกาศ LINE
  const handleLineBroadcast = async () => {
    const message = prompt("📢 พิมพ์ข้อความที่ต้องการประกาศเข้า LINE ของทุกคน:");
    if (!message || !message.trim()) return;

    if (!confirm(`ยืนยันจะส่งข้อความนี้หาทุกคน?\n\n"${message}"`)) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message })
      });
      const data = await res.json();

      if (data.success) {
        alert(`✅ ส่งสำเร็จ! แจ้งเตือนไปยัง ${data.count} คน`);
      } else {
        alert(`❌ ส่งไม่สำเร็จ: ${data.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('เชื่อมต่อ Server ไม่ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (tx1: any, tx2?: any) => {
    try {
      await api.addTransaction(tx1);
      if (tx2) {
        await api.addTransaction(tx2);
      }
      await refreshData();
      setShowForm(false);
      setFormDefaults(undefined);
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const getPriceFromPeriod = (pName: string) => {
    if (currentClassroom.periodAmounts && currentClassroom.periodAmounts[pName]) {
      return currentClassroom.periodAmounts[pName];
    }
    const match = pName.match(/(\d+)/);
    if (match) return parseInt(match[0]);
    return 0;
  }

  const handleQuickPay = (student: User, period: string) => {
    const presetAmount = getPriceFromPeriod(period) || currentClassroom.monthlyFee || 0;
    setFormDefaults({
      userId: student._id,
      studentName: student.name,
      amount: presetAmount,
      period: period,
      type: TransactionType.DEPOSIT,
      note: `จ่ายรอบ: ${period}`
    });
    setShowForm(true);
  };

  const handleAddPeriod = async () => {
    if (!newPeriodName.trim()) return;
    const pName = newPeriodName.trim();
    const updatedRoom = {
      ...currentClassroom,
      activePeriods: [...(currentClassroom.activePeriods || []), pName],
    };
    await api.updateClassroom(updatedRoom);
    setNewPeriodName('');
    setShowAddPeriod(false);
    await refreshData();
  };

  const handleRemovePeriod = async (pName: string) => {
    if (!confirm(`ต้องการลบรอบ "${pName}" หรือไม่?`)) return;
    const newAmounts = { ...(currentClassroom.periodAmounts || {}) };
    delete newAmounts[pName];
    const updatedRoom = {
      ...currentClassroom,
      activePeriods: (currentClassroom.activePeriods || []).filter(p => p !== pName),
      periodAmounts: newAmounts
    };
    await api.updateClassroom(updatedRoom);
    await refreshData();
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const updatedRoom = { ...currentClassroom, paymentQrCode: base64 };
        await api.updateClassroom(updatedRoom);
        setCurrentClassroom(updatedRoom);
      };
      reader.readAsDataURL(file);
    }
  };

  const getPeriodTotal = (periodName: string) => {
    return transactions
      .filter(t => t.period === periodName && t.status === TransactionStatus.APPROVED)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const exportToExcel = () => {
    const students = users.filter(u => u.role === UserRole.STUDENT);
    const header = ['ลำดับ', 'ชื่อ-นามสกุล', ...periods, 'ยอดรวมจ่ายจริง (บาท)'];

    const body = students.map((u, index) => {
      let studentTotal = 0;
      const statusCols = periods.map(p => {
        const paidTxs = transactions.filter(t =>
          t.userId === u._id &&
          t.period === p &&
          t.status === TransactionStatus.APPROVED
        );

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

  const pendingCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

  const renderContent = () => {
    if (tab === 'MONTHLY' && isAdmin) {
      return (
        <div className="min-w-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-3 text-left border-b sticky left-0 bg-slate-50 z-10 min-w-[200px]">รายชื่อนักเรียน</th>
                {periods.map(p => (
                  <th key={p} className="p-3 text-center border-b min-w-[120px] relative group">
                    <span>{p}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleRemovePeriod(p); }} className="absolute -top-1 -right-1 hidden group-hover:flex bg-red-500 text-white w-4 h-4 rounded-full items-center justify-center text-[10px] shadow-sm z-10">&times;</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role === UserRole.STUDENT).map(u => (
                <tr key={u._id} className="hover:bg-slate-50 border-b border-slate-100 group">
                  <td className="p-3 font-bold sticky left-0 bg-white border-r group-hover:bg-slate-50 z-10">{u.name}</td>
                  {periods.map(p => {
                    const paidTxs = transactions.filter(t =>
                      t.userId === u._id &&
                      t.period === p &&
                      t.status === TransactionStatus.APPROVED
                    );

                    let cellContent = (<button onClick={() => handleQuickPay(u, p)} className="text-slate-200 hover:text-emerald-400 text-lg transition-colors">❌</button>);

                    if (paidTxs.length > 0) {
                      const sum = paidTxs.reduce((acc, t) => acc + t.amount, 0);
                      cellContent = <span className="text-emerald-600 font-bold">{sum.toLocaleString()}</span>;
                    }

                    return (
                      <td key={p} className="p-3 text-center">
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <td className="p-4 text-right sticky left-0 bg-slate-100 z-10 border-t-2 border-indigo-100 text-indigo-900">
                  รวมยอดรับจริง (บาท)
                </td>
                {periods.map(p => (
                  <td key={p} className="p-4 text-center border-t-2 border-indigo-100 text-emerald-600 font-mono text-base">
                    {getPeriodTotal(p).toLocaleString()}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    if (tab === 'INDIVIDUAL') {
      return (
        <table className="w-full text-left">
          <thead className="bg-slate-50 font-bold">
            <tr><th className="p-4">ชื่อ</th><th className="p-4 text-right">เงินคงเหลือในบัญชี</th></tr>
          </thead>
          <tbody>
            {users.filter(u => u.role === UserRole.STUDENT).map(u => (
              <tr key={u._id} className="border-b hover:bg-gray-50 transition-colors"><td className="p-4 font-medium">{u.name}</td><td className="p-4 text-right font-mono font-bold text-emerald-600">{api.calculateBalance(transactions, u._id).toLocaleString()} ฿</td></tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <TransactionList
        transactions={transactions}
        isAdmin={isAdmin}
        periods={periods}
        onStatusChange={async (id, status, p1, a1, p2, a2) => {
          try {
            await api.updateTransaction(id, {
              status,
              period: p1,
              amount: a1,
              approver: user.name
            });

            if (p2 && (a2 || 0) > 0) {
              const originalTx = transactions.find(t => t._id === id);
              if (originalTx) {
                await api.addTransaction({
                  userId: originalTx.userId,
                  studentName: originalTx.studentName,
                  classroomId: currentClassroom.id,
                  type: originalTx.type,
                  amount: a2,
                  period: p2,
                  note: originalTx.note ? `${originalTx.note} (ส่วนเพิ่ม)` : '',
                  slipImage: originalTx.slipImage,
                  slipHash: originalTx.slipHash,
                  status: TransactionStatus.APPROVED,
                  approver: user.name
                });
              }
            }
            await refreshData();
          } catch (error) {
            console.error("Error splitting transaction:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
          }
        }}
        filter={tab === 'PENDING' ? 'PENDING' : 'APPROVED'}
      />
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sarabun text-slate-800">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg font-bold">C</div>
            <h1 className="font-bold text-lg">{currentClassroom.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2 border-r border-slate-700 pr-4">
              <span className="text-[10px] text-slate-400">เข้าใช้งานโดย</span>
              <span className="text-sm font-bold text-white">{user.name}</span>
            </div>
            {isAdmin && (
              <button onClick={() => setShowUserMgmt(true)} className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-indigo-500/30">
                👥 จัดการสมาชิก
              </button>
            )}
            <button onClick={onLogout} className="text-red-400 font-bold text-sm hover:underline">ออกจากระบบ</button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* === ส่วนประกาศข่าวบนหน้าเว็บ === */}
        {(isAdmin || currentClassroom.announcement) && (
          <div className={`mb-6 p-6 rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${currentClassroom.announcement
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
                    ประกาศจากผู้ดูแลระบบ
                  </h3>
                  {currentClassroom.announcementDate && currentClassroom.announcement && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white/90">
                      {new Date(currentClassroom.announcementDate).toLocaleDateString('th-TH')}
                    </span>
                  )}
                </div>

                {isEditingAnnounce ? (
                  <div className="mt-2 animate-fade-in">
                    <textarea
                      className="w-full p-3 rounded-xl text-gray-800 text-sm border-2 border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                      rows={3}
                      placeholder="พิมพ์ข้อความประกาศ..."
                      value={announceText}
                      onChange={(e) => setAnnounceText(e.target.value)}
                      autoFocus
                    />
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
                  {/* ปุ่มประกาศ LINE */}
                  <button
                    onClick={handleLineBroadcast}
                    className="bg-[#06C755] hover:bg-[#05b34c] text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#06C755]/20 border border-transparent"
                    title="ส่งข้อความเข้า LINE"
                  >
                    ประกาศ LINE
                  </button>

                  {/* ปุ่มแก้ไข */}
                  <button
                    onClick={() => setIsEditingAnnounce(true)}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all flex items-center justify-center backdrop-blur-md border border-white/20"
                    title="แก้ไขประกาศบนเว็บ"
                  >
                    ประกาศบนเว็บ
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">ยอดเงินรวมในระบบ</p>
            <h2 className="text-3xl font-bold text-emerald-600">{balance.toLocaleString()} <span className="text-lg">฿</span></h2>
          </div>

          {isAdmin ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex overflow-hidden group">
              <div onClick={() => setTab('PENDING')} className="flex-1 p-6 cursor-pointer hover:bg-amber-50 transition-colors border-r border-slate-100 flex flex-col">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">รออนุมัติ</p>
                <h2 className="text-3xl font-bold text-amber-500">{pendingCount}</h2>
              </div>
              <div onClick={() => setShowForm(true)} className="flex-1 p-6 cursor-pointer hover:bg-emerald-50 transition-colors flex flex-col items-center justify-center bg-emerald-50/20">
                <p className="text-emerald-600 text-[10px] uppercase font-bold mb-1">บันทึกใหม่</p>
                <div className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></div>
              </div>
            </div>
          ) : (
            <div onClick={() => setShowForm(true)} className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white cursor-pointer hover:scale-[1.02] transition-all">
              <p className="text-white/70 text-xs uppercase tracking-wider mb-1">สถานะของฉัน</p>
              <h2 className="text-2xl font-bold">แจ้งฝากเงิน ➜</h2>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 relative overflow-hidden group">
            {currentClassroom.paymentQrCode ? (
              <>
                <img src={currentClassroom.paymentQrCode} className="w-16 h-16 rounded-lg object-contain bg-gray-50 p-1" alt="Payment QR" />
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase font-bold">QR รับเงิน</p>
                  <button onClick={() => setShowForm(true)} className="text-xs font-bold text-indigo-600 hover:underline">คลิกเพื่อสแกนจ่าย</button>
                </div>
                {isAdmin && <button onClick={() => qrInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-all">เปลี่ยนรูป</button>}
              </>
            ) : (
              <div className="flex flex-col justify-center h-full flex-1">
                <p className="text-gray-400 text-[10px]">ยังไม่มี QR Code</p>
                {isAdmin && <button onClick={() => qrInputRef.current?.click()} className="text-[10px] text-indigo-600 font-bold underline">อัปโหลดรูปภาพ</button>}
              </div>
            )}
            <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <>
                  <button onClick={() => setTab('PENDING')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tab === 'PENDING' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>รออนุมัติ</button>
                  <button onClick={() => setTab('MONTHLY')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tab === 'MONTHLY' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>ติดตามการจ่ายเงิน</button>
                </>
              )}
              <button onClick={() => setTab('HISTORY')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tab === 'HISTORY' ? 'bg-slate-200 text-slate-800 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>ประวัติทั้งหมด</button>
              <button onClick={() => setTab('INDIVIDUAL')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${tab === 'INDIVIDUAL' ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>ยอดรายบุคคล</button>
            </div>
            {tab === 'MONTHLY' && isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => setShowAddPeriod(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"><span className="text-lg">+</span> เพิ่มรอบ</button>
                <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                  <span className="text-lg">📊</span> ดาวน์โหลด Excel
                </button>
              </div>
            )}
          </div>

          <div className="p-4 overflow-x-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {showAddPeriod && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <h3 className="font-bold text-lg mb-4">เพิ่มรอบการเก็บเงินใหม่</h3>
            <div className="space-y-3 mb-6">
              <input autoFocus type="text" value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ชื่อรายการ (เช่น ค่าเสื้อ)..." />
            </div>
            <div className="flex gap-3"><button onClick={() => setShowAddPeriod(false)} className="flex-1 py-3 text-gray-500 font-bold">ยกเลิก</button><button onClick={handleAddPeriod} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">บันทึก</button></div>
          </div>
        </div>
      )}

      {showForm && (
        <TransactionForm
          classroom={currentClassroom}
          userRole={user.role}
          currentUserId={user._id}
          currentUserName={user.name}
          users={users}
          defaultValues={formDefaults}
          onSubmit={handleAddTransaction}
          onCancel={() => { setShowForm(false); setFormDefaults(undefined); }}
        />
      )}
      {showUserMgmt && <UserManagement onClose={() => { setShowUserMgmt(false); refreshData(); }} />}

      {user && !isAdmin && !(user as any).lineUserId && (
        <ConnectLine
          currentUser={user}
          onLinkSuccess={() => window.location.reload()}
        />
      )}

    </div>
  );
};

export default Dashboard;