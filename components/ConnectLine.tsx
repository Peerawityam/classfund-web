
import React, { useEffect, useState } from 'react';
import liff from '@line/liff';

const ConnectLine = ({ currentUser, onLinkSuccess }: any) => {
  // ประกาศตัวแปร status (idle, loading, success, error)
  const [status, setStatus] = useState("idle"); 

  // 1. ⚠️ ใส่ LIFF ID ของคุณตรงนี้
  const LIFF_ID = "2008777068-WJ83pSqD"; 

  const handleLinkLine = async () => {
    try {
      // ✅ แก้จาก setLoading(true) เป็น setStatus("loading") แล้ว
      setStatus("loading"); 
      
      await liff.init({ liffId: LIFF_ID });

      if (!liff.isLoggedIn()) {
        liff.login(); 
        return; 
      }

      const profile = await liff.getProfile();
      const lineUserId = profile.userId; 
      
      console.log("ได้ User ID แล้ว:", lineUserId);

      const response = await fetch('http://localhost:3001/api/update-line-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username, 
          lineUserId: lineUserId          
        })
      });

      if (response.ok) {
        setStatus("success");
        if (onLinkSuccess) onLinkSuccess(); 
        alert("เชื่อมต่อ LINE เรียบร้อย! คุณจะได้รับการแจ้งเตือนแล้ว");
      } else {
        setStatus("error");
        alert("บันทึกข้อมูลไม่สำเร็จ");
      }

    } catch (err) {
      console.error("LIFF Error:", err);
      setStatus("error");
    }
  };

  useEffect(() => {
    const autoCheck = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
           // ถ้าล็อกอินค้างไว้แล้ว (เช่น redirect กลับมา) ให้ user กดปุ่มเองเพื่อยืนยัน
        }
      } catch (e) {
        console.error(e);
      }
    };
    autoCheck(); 
  }, []);

  if (status === "success") return null; 

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-sarabun">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center">
        <h3 className="text-xl font-bold mb-2">🔔 เชื่อมต่อการแจ้งเตือน</h3>
        <p className="text-gray-500 mb-6 text-sm">
          เพื่อให้คุณไม่พลาดทุกยอดเงินเข้า กรุณากดปุ่มด้านล่างเพื่อเชื่อมต่อกับ LINE ของคุณ
        </p>

        <button
          onClick={handleLinkLine}
          disabled={status === "loading"}
          className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
        >
          {status === "loading" ? (
             <span>กำลังเชื่อมต่อ...</span>
          ) : (
             <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M22 10.4c0-5.2-4.8-9.4-10.7-9.4S.6 5.2.6 10.4c0 4.6 3.7 8.5 8.9 9.2.4.1.9.3.7.8-.1.3-.2.8-.4 1.4-.2.8-.8 2.2 1.9.6l5.3-4.5c2.9-.4 5-2.6 5-5.5z"/>
                </svg>
                เชื่อมต่อ LINE ทันที
             </>
          )}
        </button>

        <button 
          onClick={() => setStatus("success")} 
          className="mt-4 text-gray-400 text-sm hover:text-gray-600 underline"
        >
          ข้ามไปก่อน
        </button>
      </div>
    </div>
  );
};

export default ConnectLine;