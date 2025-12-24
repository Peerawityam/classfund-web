import React, { useState } from 'react';
import { login } from '../services/apiService';
import { User } from '../types';

interface Props {
  className: string;
  onLogin: (user: User) => void;
}

const Auth: React.FC<Props> = ({ className, onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // ----------------------------------------------------
  // แก้ไขตรงนี้: เปลี่ยน false เป็น true เพื่อให้แสดงทันทีที่เปิดหน้าเว็บ
  // ----------------------------------------------------
  const [showHelp, setShowHelp] = useState(true); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        const user = await login(username, password);
        if (user) {
          onLogin(user);
        } else {
          setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (e) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ หรือ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 font-sarabun relative">
      
      {/* --- ส่วน Popup Modal --- */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-[fade-in_0.2s_ease-out]">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">วิธีการใช้งาน</h3>
            </div>

            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</span>
                <div>
                  <p className="font-bold text-gray-800">ชื่อผู้ใช้งาน (Username)</p>
                  <p className="text-xs">กรอกรหัสนักศึกษาของตนเอง</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</span>
                <div>
                  <p className="font-bold text-gray-800">รหัสผ่าน (Password)</p>
                  <p className="text-xs">ใช้เลข 6 ตัวท้ายของรหัสนักศึกษา (เช่น 10XXXX)</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full border border-gray-100 relative">
        
        {/* ปุ่มเรียก Popup (ยังคงไว้ เผื่อปิดไปแล้วอยากเปิดดูใหม่) */}
        <button 
          onClick={() => setShowHelp(true)}
          className="absolute top-4 right-4 text-gray-300 hover:text-emerald-500 transition-colors p-2"
          title="วิธีใช้งาน"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-sm">
            {className.charAt(0)}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{className}</h2>
          <p className="text-gray-500 text-xs">ยินดีต้อนรับสู่ระบบ</p>
        </div>

        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-[10px] font-bold text-center mb-6 border border-emerald-100">
          กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานที่ได้รับจากผู้ดูแล
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">ชื่อผู้ใช้งาน</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Password"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs text-center font-bold bg-red-50 p-3 rounded-lg border border-red-100">⚠️ {error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-100 ${loading ? 'opacity-70' : 'active:scale-95'}`}
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Student Default Credentials</p>
            <code className="text-[10px] text-gray-500">user: รหัสนักศึกษา | pass: 6 ตัวท้ายรหัสนักศึกษา (10XXXX)</code>
        </div>
      </div>
    </div>
  );
};

export default Auth;