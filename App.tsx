import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import LoadingScreen from './components/LoadingScreen';
import { AppState, User } from './types';
import * as api from './services/apiService';

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentClassroom: null,
    currentUser: null,
  });
  
  // เริ่มต้นเป็น true ไว้ก่อน แต่ถ้ามี Cache จะเปลี่ยนเป็น false ทันทีในเสี้ยววินาที
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("กำลังตรวจสอบข้อมูล...");

  // 🔥 1. Logic: Show Cache First & Background Sync
  useEffect(() => {
    const initializeApp = async () => {
        // --- A. 🚀 FAST LOAD: ดึงจาก Cache ในเครื่องมาโชว์ก่อนเลย ---
        const cachedClassroom = localStorage.getItem('classfund_classroom');
        const cachedUser = localStorage.getItem('classfund_user');
        
        let hasCache = false;

        if (cachedClassroom) {
            setAppState(prev => ({ 
                ...prev, 
                currentClassroom: JSON.parse(cachedClassroom) 
            }));
        }

        if (cachedUser) {
            setAppState(prev => ({ 
                ...prev, 
                currentUser: JSON.parse(cachedUser) 
            }));
        }

        // ✅ ถ้ามีข้อมูลครบ ให้ปิดหน้า Loading ทันที! User จะได้ใช้งานได้เลยไม่ต้องรอ Server
        if (cachedClassroom && cachedUser) {
            setLoading(false); 
            hasCache = true;
        }

        // --- B. 🐢 SLOW LOAD: แอบโหลดข้อมูลจริงจาก Server (Background Fetch) ---
        try {
            // ถ้าไม่มี Cache เลย (เข้าครั้งแรก) ให้ขึ้นสถานะว่ากำลังปลุก Server
            if (!hasCache) setLoadingStatus("กำลังปลุกระบบ Server...");
            
            // โหลดข้อมูลห้องเรียนล่าสุด
            const classroom = await api.initClassroom();
            
            // 💾 บันทึกข้อมูลล่าสุดลง Cache
            localStorage.setItem('classfund_classroom', JSON.stringify(classroom)); 

            // ตรวจสอบ User ล่าสุด
            const savedUserId = localStorage.getItem('last_active_user_id');
            let user: User | null = null;
            
            if (savedUserId) {
                 const users = await api.getUsers();
                 // หา User จาก ID ที่บันทึกไว้
                 user = users.find(u => u._id === savedUserId) || null;
                 
                 if (user) {
                     // ถ้าเจอ User: อัปเดต Cache
                     localStorage.setItem('classfund_user', JSON.stringify(user));
                 } else {
                     // ถ้าไม่เจอ User (โดนลบไปแล้ว): เคลียร์ Cache ทิ้ง
                     localStorage.removeItem('classfund_user');
                     localStorage.removeItem('last_active_user_id');
                 }
            }

            // 🔄 SYNC: อัปเดตหน้าจอด้วยข้อมูลล่าสุดจาก Server (User อาจจะไม่รู้ตัว)
            setAppState({ currentClassroom: classroom, currentUser: user });

        } catch (e) {
            console.error("Sync Error (Offline mode active):", e);
            // ถ้า Server พัง หรือเน็ตหลุด แต่มี Cache ก็ปล่อยให้เล่น Offline Mode ไป (ไม่ Error)
        } finally {
            setLoading(false); // มั่นใจว่าปิดหน้าโหลดแน่นอน
        }
    };

    initializeApp();
  }, []);

  // 🔥 2. Auto Logout Logic (5 Minutes Inactivity)
  useEffect(() => {
    const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 นาที
    let logoutTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (!appState.currentUser) return;
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        console.log("Session Timeout: Auto Logout");
        handleLogout(); 
      }, TIMEOUT_DURATION);
    };

    if (appState.currentUser) {
        resetTimer();
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        return () => {
            clearTimeout(logoutTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }
  }, [appState.currentUser]);

  // ฟังก์ชันเมื่อ Login สำเร็จ
  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('last_active_user_id', user._id);
    localStorage.setItem('classfund_user', JSON.stringify(user));
    setAppState(prev => ({ ...prev, currentUser: user }));
  };

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    // ล้างแค่ User แต่เก็บข้อมูลห้องเรียนไว้ (จะได้ไม่ต้องโหลดใหม่ตอน Login อีกรอบ)
    localStorage.removeItem('last_active_user_id');
    localStorage.removeItem('classfund_user');
    setAppState(prev => ({ ...prev, currentUser: null }));
  };

  // ---------------- RENDER ----------------

  // 1. ถ้ากำลังโหลด และไม่มี Cache ให้โชว์หน้า Loading สวยๆ
  if (loading) return <LoadingScreen status={loadingStatus} />;

  // 2. ถ้ามีข้อมูลพร้อมแล้ว (จาก Cache หรือ Server) -> ไป Dashboard
  if (appState.currentClassroom && appState.currentUser) {
    return (
        <Dashboard 
            classroom={appState.currentClassroom} 
            user={appState.currentUser} 
            onLogout={handleLogout} 
        />
    );
  }

  // 3. ถ้ายังไม่ Login (หรือหา User ไม่เจอ) -> ไปหน้า Login
  return (
    <Auth 
        className={appState.currentClassroom?.name || 'ระบบเช็ค/เก็บเงิน'} 
        onLogin={handleLoginSuccess} 
    />
  );
}

export default App;