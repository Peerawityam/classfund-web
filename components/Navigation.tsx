import React from 'react';
import { Home, ScanLine, LogOut, BarChart3, User, Settings, UserCircle, Cog, ScrollText } from 'lucide-react';
import ThemeToggle from './ui/ThemeToggle';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isAdmin: boolean; // ✅ เพิ่มตัวแปรเช็กสถานะ Admin
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onLogout, isAdmin }) => {
  return (
    <>
      {/* Desktop Top Bar */}
      <nav className="hidden md:flex justify-between items-center px-8 py-4 nav-bar shadow-sm sticky top-0 z-40 border-b">
        <div className="font-bold text-xl text-emerald-600 flex items-center gap-2">
          <span>🎓</span> ClassFund
        </div>
        <div className="flex gap-6 items-center">
          <button onClick={() => setActiveTab('home')} className={`transition-colors ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>หน้าหลัก</button>

          {/* ✅ แท็บ Analytics สำหรับ Admin */}
          {isAdmin && (
            <button onClick={() => setActiveTab('analytics')} className={`transition-colors flex items-center gap-1.5 ${activeTab === 'analytics' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>
              <BarChart3 size={18} />
              Analytics
            </button>
          )}

          {/* ✅ ซ่อนปุ่มสแกนถ้าเป็น Admin */}
          {!isAdmin && (
            <button onClick={() => setActiveTab('scan')} className={`transition-colors ${activeTab === 'scan' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>แจ้งฝากเงิน</button>
          )}

          {/* ✅ แท็บโปรไฟล์ (ทุกคน) */}
          <button onClick={() => setActiveTab('profile')} className={`transition-colors flex items-center gap-1.5 ${activeTab === 'profile' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>
            <UserCircle size={18} />
            โปรไฟล์
          </button>

          {/* ✅ แท็บการตั้งค่า (Admin เท่านั้น) */}
          {isAdmin && (
            <button onClick={() => setActiveTab('settings')} className={`transition-colors flex items-center gap-1.5 ${activeTab === 'settings' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>
              <Cog size={18} />
              ตั้งค่า
            </button>
          )}

          {/* ✅ แท็บประวัติการใช้งาน (Admin เท่านั้น) */}
          {isAdmin && (
            <button onClick={() => setActiveTab('audit')} className={`transition-colors flex items-center gap-1.5 ${activeTab === 'audit' ? 'text-emerald-600 font-bold' : 'nav-link'}`}>
              <ScrollText size={18} />
              ประวัติการใช้งาน
            </button>
          )}

          <ThemeToggle />
          <div className="h-4 w-px nav-divider mx-2"></div>
          <button onClick={onLogout} className="text-red-500 hover:text-red-700 font-medium text-sm">ออกจากระบบ</button>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full nav-bar border-t pb-safe z-50 flex justify-around items-center py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">หน้าหลัก</span>
        </button>

        {/* ✅ Analytics สำหรับ Admin */}
        {isAdmin && (
          <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'analytics' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <BarChart3 size={24} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Analytics</span>
          </button>
        )}

        {/* ✅ ซ่อนปุ่มสแกนถ้าเป็น Admin */}
        {!isAdmin && (
          <div className="-mt-8">
            <button onClick={() => setActiveTab('scan')} className="bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-transform active:scale-95">
              <ScanLine size={28} />
            </button>
          </div>
        )}

        {/* ✅ โปรไฟล์ (ทุกคน) */}
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">โปรไฟล์</span>
        </button>

        {/* ✅ ตั้งค่า (Admin) */}
        {isAdmin && (
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'settings' ? 'text-emerald-600' : 'text-gray-400'}`}>
            <Settings size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">ตั้งค่า</span>
          </button>
        )}

        <button onClick={onLogout} className="flex flex-col items-center gap-1 p-2 w-16 text-gray-400 hover:text-red-500">
          <LogOut size={24} />
          <span className="text-[10px] font-medium">ออก</span>
        </button>
      </nav>
      <div className="md:hidden h-24"></div>
    </>
  );
};

export default Navigation;