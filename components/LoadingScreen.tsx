
import React, { useState, useEffect } from 'react';
import logoImage from '../ClassFundIcon.png';

interface Props {
  text?: string;
}

const LoadingScreen: React.FC<Props> = ({ text = "กำลังเข้าสู่ระบบ..." }) => {
  const [message, setMessage] = useState(text);
  const [isLongWait, setIsLongWait] = useState(false);

  useEffect(() => {
    // ตั้งเวลา 3 วินาที (3000ms)
    const timer = setTimeout(() => {
      setMessage("กำลังปลุกเซิร์ฟเวอร์ ...");
      setIsLongWait(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm transition-all duration-500 text-white font-sarabun">
      
      {/* Container Animation */}
      <div className="relative flex items-center justify-center mb-8">
        {/* วงกลมหมุนๆ */}
        <div className="absolute w-28 h-28 border-4 border-emerald-500/20 rounded-full"></div>
        <div className="absolute w-28 h-28 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        
        {/* โลโก้เด้งดึ๋ง */}
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-pulse relative z-10">
        <img 
            src={logoImage}
            alt="Company Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* ข้อความหลัก */}
      <h3 className="text-xl font-bold tracking-wide animate-pulse mb-2">{message}</h3>

      {/* ข้อความเสริม (จะโชว์เมื่อรอนานเกิน 3 วิ) */}
      {isLongWait && (
        <div className="text-center animate-fade-in-up px-4">
          <p className="text-slate-400 text-sm mb-1">เนื่องจากเซิร์ฟเวอร์อยู่ในโหมดพักผ่อน</p>
          <p className="text-emerald-400 text-sm font-bold">อาจใช้เวลาโหลด 1-2 นาที ในครั้งแรก</p>
          <p className="text-slate-500 text-xs mt-4">กรุณาอย่าปิดหน้าต่าง...</p>
        </div>
      )}

      {/* จุดวิ่งดุ๊กดิ๊ก */}
      {!isLongWait && (
        <div className="flex gap-1.5 justify-center mt-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></div>
        </div>
      )}

    </div>
  );
};

export default LoadingScreen;