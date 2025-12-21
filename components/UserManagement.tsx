import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import * as api from '../services/apiService';

interface Props {
  onClose: () => void;
}

const UserManagement: React.FC<Props> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '', role: UserRole.STUDENT });
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.name) return;
    setLoading(true);
    try {
      await api.addUser({
        classroomId: 'MAIN',
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        password: newUser.password || '1234',
        role: newUser.role as UserRole
      });
      setNewUser({ username: '', name: '', password: '', role: UserRole.STUDENT });
      await loadUsers();
      setImportStatus({ msg: 'เพิ่มสมาชิกสำเร็จ', type: 'success' });
    } catch (err: any) {
      setImportStatus({ msg: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`ต้องการลบรายชื่อ "${name}" หรือไม่?`)) {
      setLoading(true);
      try {
        await api.deleteUser(id);
        await loadUsers();
      } finally {
        setLoading(false);
      }
    }
  };

  // --- ฟังก์ชันลบทั้งหมด (เฉพาะนักเรียน) ---
  const handleDeleteAll = async () => {
    // กรองเฉพาะคนที่ไม่ใช่ ADMIN (เพื่อความปลอดภัย)
    const studentsToDelete = users.filter(u => u.role !== UserRole.ADMIN);

    if (studentsToDelete.length === 0) {
      alert("ไม่พบรายการนักเรียนให้ลบ");
      return;
    }

    if (!confirm(`⚠️ คำเตือน!\nคุณต้องการลบนักเรียนทั้งหมด ${studentsToDelete.length} คนใช่หรือไม่?\n(Admin จะไม่ถูกลบ)`)) {
      return;
    }

    if (!confirm(`ยืนยันครั้งสุดท้าย! ข้อมูลจะหายไปถาวร`)) {
      return;
    }

    setLoading(true);
    setImportStatus({ msg: 'กำลังลบข้อมูล...', type: 'info' });

    try {
      let count = 0;
      // วนลูปลบทีละคน
      for (const user of studentsToDelete) {
        if (user._id) {
          await api.deleteUser(user._id);
          count++;
        }
      }
      setImportStatus({ msg: `ลบข้อมูลสำเร็จจำนวน ${count} รายการ`, type: 'success' });
      await loadUsers();
    } catch (error) {
      console.error(error);
      setImportStatus({ msg: 'เกิดข้อผิดพลาดในการลบข้อมูล', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      setLoading(true);
      setImportStatus({ msg: 'กำลังนำเข้าข้อมูล...', type: 'info' });

      const lines = text.split(/\r\n|\n/);
      let successCount = 0;
      let failCount = 0;

      const promises = lines.map(async (line) => {
        const cols = line.split(','); 
        if (cols.length < 2) return; 

        const name = cols[0]?.trim();
        const username = cols[1]?.trim();
        const roleStr = cols[2]?.trim().toUpperCase();
        const password = cols[3]?.trim();

        if (!name || !username) return;

        let role = UserRole.STUDENT;
        if (roleStr === 'ADMIN') role = UserRole.ADMIN;

        try {
          await api.addUser({
            classroomId: 'MAIN',
            username: username,
            name: name,
            password: password || '1234',
            role: role
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      });

      await Promise.all(promises);
      await loadUsers();
      setLoading(false);
      setImportStatus({ 
        msg: `นำเข้าเสร็จสิ้น: สำเร็จ ${successCount}, ล้มเหลว ${failCount}`, 
        type: failCount > 0 ? 'info' : 'success' 
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm font-sarabun">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-bold text-xl">จัดการสมาชิก</h2>
            <p className="text-xs text-slate-500">จัดการรายชื่อนักเรียนในระบบ</p>
          </div>
          <button onClick={onClose} className="text-3xl hover:text-red-500 transition-colors">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {importStatus && (
            <div className={`p-3 rounded-xl text-sm text-center ${
              importStatus.type === 'success' ? 'bg-green-100 text-green-700' : 
              importStatus.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {importStatus.msg}
            </div>
          )}

          <div className="bg-slate-50 p-6 rounded-2xl border space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-600">เครื่องมือจัดการ</span>
              
              <div className="flex gap-2">
                {/* ปุ่มลบทั้งหมด */}
                <button 
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={loading || users.filter(u => u.role !== UserRole.ADMIN).length === 0}
                  className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors border border-red-200"
                >
                  🗑️ ล้างรายชื่อนักเรียน
                </button>

                {/* ปุ่ม CSV */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  📂 นำเข้า CSV
                </button>
              </div>
            </div>

            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="ชื่อ-นามสกุล" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="px-4 py-2.5 border rounded-xl text-sm" required />
                <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="px-4 py-2.5 border rounded-xl text-sm" required />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="px-4 py-2.5 border rounded-xl text-sm">
                  <option value={UserRole.STUDENT}>STUDENT</option>
                  <option value={UserRole.ADMIN}>ADMIN</option>
                </select>
                <input type="text" placeholder="รหัสผ่าน" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="px-4 py-2.5 border rounded-xl text-sm" />
                <button type="submit" disabled={loading} className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-colors shadow-md shadow-indigo-200">บันทึก</button>
            </form>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400 px-2">รายชื่อทั้งหมด ({users.length})</div>
            {users.map(u => (
              <div key={u._id} className="flex justify-between items-center p-4 border rounded-2xl hover:bg-slate-50 group transition-colors bg-white">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold ${u.role === UserRole.ADMIN ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-700'}`}>{u.role === UserRole.ADMIN ? 'ADM' : 'STU'}</div>
                  <div><div className="text-sm font-bold">{u.name}</div><div className="text-[10px] text-slate-400">@{u.username}</div></div>
                </div>
                {u.username !== 'admin' && (<button onClick={() => handleDelete(u._id, u.name)} className="opacity-0 group-hover:opacity-100 text-red-500 p-2 transition-opacity hover:bg-red-50 rounded-lg">&times;</button>)}
              </div>
            ))}
            {users.length === 0 && !loading && (
              <div className="text-center text-slate-400 py-10">ยังไม่มีสมาชิกในระบบ</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;