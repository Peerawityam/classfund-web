
import { useEffect, useState } from 'react';
import liff from '@line/liff';

const ConnectLine = ({ currentUser, onLinkSuccess }: any) => {
  const [status, setStatus] = useState("idle");

  // ⚠️ ใส่ LIFF ID ของคุณตรงนี้
  const LIFF_ID = "2008777068-WJ83pSqD"; // <-- ตรวจสอบว่าใส่รหัสถูกต้องหรือยัง

  const API_URL = 'https://classfund-web.onrender.com/api/update-line-id';

  const saveDataToBackend = async (lineUserId: string) => {
    try {
      console.log("กำลังบันทึก LINE ID:", lineUserId);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          lineUserId: lineUserId
        })
      });

      if (response.ok) {
        setStatus("success");
        alert("✅ เชื่อมต่อ LINE สำเร็จ!");
        if (onLinkSuccess) onLinkSuccess();
      } else {
        const errData = await response.json();
        console.error("Save Error:", errData);
        alert(`❌ บันทึกไม่สำเร็จ: ${errData.message || 'Server Error'}`);
        setStatus("error");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("❌ เชื่อมต่อ Server ไม่ได้ (ถ้าอยู่บน Vercel อย่าลืมเช็คว่า Backend ออนไลน์อยู่ไหม)");
      setStatus("error");
    }
  };

  const handleLinkLine = async () => {
    try {
      setStatus("loading");
      await liff.init({ liffId: LIFF_ID });

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      // ถ้าล็อกอินแล้ว ดึง ID มาบันทึกเลย
      const profile = await liff.getProfile();
      await saveDataToBackend(profile.userId);

    } catch (err) {
      console.error("LIFF Error:", err);
      alert("เกิดข้อผิดพลาดของ LINE LIFF: " + err);
      setStatus("error");
    }
  };

  // ตรวจสอบสถานะตอนโหลดหน้า (Auto Check)
  useEffect(() => {
    const autoCheck = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        // ถ้ากลับมาจากการล็อกอินแล้ว ให้บันทึกเลย ไม่ต้องรอกดปุ่ม
        if (liff.isLoggedIn()) {
          setStatus("loading");
          const profile = await liff.getProfile();
          await saveDataToBackend(profile.userId);
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
            <span>⏳ กำลังบันทึกข้อมูล...</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M22 10.4c0-5.2-4.8-9.4-10.7-9.4S.6 5.2.6 10.4c0 4.6 3.7 8.5 8.9 9.2.4.1.9.3.7.8-.1.3-.2.8-.4 1.4-.2.8-.8 2.2 1.9.6l5.3-4.5c2.9-.4 5-2.6 5-5.5z" />
              </svg>
              เชื่อมต่อ LINE ทันที
            </>
          )}
        </button>

        <button
          onClick={() => setStatus("success")}
          className="mt-4 text-gray-400 text-sm hover:text-gray-600 underline"
        >
        </button>
      </div>
    </div>
  );
};

export default ConnectLine;