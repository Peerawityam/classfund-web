import React from 'react';
import { Home, ScanLine, LogOut } from 'lucide-react';

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
      <nav className="hidden md:flex justify-between items-center px-8 py-4 bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="font-bold text-xl text-emerald-600 flex items-center gap-2">
          <span>🎓</span> ClassFund
        </div>
        <div className="flex gap-6 items-center">
          <button onClick={() => setActiveTab('home')} className={`transition-colors ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-emerald-600'}`}>หน้าหลัก</button>
          
          {/* ✅ ซ่อนปุ่มสแกนถ้าเป็น Admin */}
          {!isAdmin && (
            <button onClick={() => setActiveTab('scan')} className={`transition-colors ${activeTab === 'scan' ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-emerald-600'}`}>แจ้งฝากเงิน</button>
          )}

          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          <button onClick={onLogout} className="text-red-500 hover:text-red-700 font-medium text-sm">ออกจากระบบ</button>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 pb-safe z-50 flex justify-around items-center py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}>
          <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">หน้าหลัก</span>
        </button>
        
        {/* ✅ ซ่อนปุ่มสแกนถ้าเป็น Admin */}
        {!isAdmin && (
            <div className="-mt-8">
                <button onClick={() => setActiveTab('scan')} className="bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-transform active:scale-95">
                  <ScanLine size={28} />
                </button>
            </div>
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