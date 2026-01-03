import React, { useState, useEffect } from 'react';
import logoImage from '../ClassFundIcon.png'; // ตรวจสอบ path รูปให้ถูกนะครับ

interface Props {
  status?: string; // เปลี่ยนชื่อ props ให้ตรงกับที่ App.tsx ส่งมา
}

const LoadingScreen: React.FC<Props> = ({ status = "กำลังเข้าสู่ระบบ..." }) => {
  const [currentMessage, setCurrentMessage] = useState(status);
  const [isLongWait, setIsLongWait] = useState(false);

  useEffect(() => {
    // อัปเดตข้อความถ้า props เปลี่ยน
    setCurrentMessage(status);
  }, [status]);

  useEffect(() => {
    // Logic เดิมของคุณ: ถ้าเกิน 3 วิ ให้เปลี่ยนข้อความบอก user ว่า server หลับ
    const timer = setTimeout(() => {
      setIsLongWait(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    // เปลี่ยนพื้นหลังเป็นสีขาว/เขียวอ่อน (Theme ใหม่)
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-50/95 backdrop-blur-sm transition-all duration-500 font-sarabun">

      {/* Container Animation */}
      <div className="relative flex items-center justify-center mb-8">
        {/* วงกลมหมุนๆ (สีเขียว Emerald) */}
        <div className="absolute w-32 h-32 border-4 border-emerald-200 rounded-full animate-ping opacity-20"></div>
        <div className="absolute w-28 h-28 border-4 border-emerald-100 rounded-full"></div>
        <div className="absolute w-28 h-28 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>

        {/* โลโก้เด้งดึ๋ง */}
        <div className="w-20 h-20 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-xl shadow-emerald-100 animate-pulse relative z-10 p-2">
          <img
            src={logoImage}
            alt="ClassFund Logo"
            className="w-full h-full object-contain" 
          />
        </div>
      </div>

      {/* ข้อความหลัก (สีเทาเข้ม อ่านง่ายบนพื้นขาว) */}
      <h3 className="text-xl font-bold tracking-wide text-gray-700 mb-2 animate-pulse">
        {isLongWait ? "กำลังปลุกเซิร์ฟเวอร์..." : currentMessage}
      </h3>

      {/* ข้อความเสริม (Logic เดิมของคุณ แต่ปรับสีให้เข้า Theme) */}
      {isLongWait && (
        <div className="text-center animate-fade-in-up px-6 py-4 bg-white/50 rounded-xl border border-emerald-100 mx-4 shadow-sm mt-4 max-w-xs">
          <p className="text-gray-500 text-sm mb-2">เนื่องจากระบบไม่ได้ใช้งานนาน</p>
          <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 py-2 px-3 rounded-lg">
            <span>⏳</span>
            <span>อาจใช้เวลาโหลด 1-2 นาที</span>
          </div>
          <p className="text-gray-400 text-xs mt-3">กรุณารอสักครู่ อย่าเพิ่งปิดหน้านี้นะครับ...</p>
        </div>
      )}

      {/* Progress Bar วิ่งๆ (เพิ่มความรู้สึกว่าระบบกำลังทำงาน) */}
      {!isLongWait && (
        <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }
      `}</style>

    </div>
  );
};

export default LoadingScreen;