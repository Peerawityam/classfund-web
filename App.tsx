import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { Classroom, AppState, User } from './types';
import * as api from './services/apiService';

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentClassroom: null,
    currentUser: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
        // --- 1. (เพิ่ม) โหลดจาก Cache ทันที เพื่อความเร็ว ---
        const cachedClassroom = localStorage.getItem('classfund_classroom');
        const cachedUser = localStorage.getItem('classfund_user');

        if (cachedClassroom) {
            // ถ้ามีข้อมูลห้องเก่า โชว์ไปก่อนเลย
            setAppState(prev => ({ ...prev, currentClassroom: JSON.parse(cachedClassroom) }));
        }
        
        if (cachedUser && cachedClassroom) {
            // ถ้ามี User เก่าด้วย ก็ล็อกอินให้เลยทันที!
            setAppState({
                currentClassroom: JSON.parse(cachedClassroom),
                currentUser: JSON.parse(cachedUser)
            });
            setLoading(false); // ⚡️ ปิด Loading ทันที ไม่ต้องรอ Server
        }


        // --- 2. (เหมือนเดิม) ดึงข้อมูลจริงจาก Server (ทำงานเบื้องหลัง) ---
        try {
            const classroom = await api.initClassroom();
            
            // ✅ อัปเดต Cache ห้องเรียน
            localStorage.setItem('classfund_classroom', JSON.stringify(classroom)); 

            const savedUserId = localStorage.getItem('last_active_user_id');
            let user: User | null = null;
            
            if (savedUserId) {
                 const users = await api.getUsers();
                 user = users.find(u => u._id === savedUserId) || null;

                 if (user) {
                     // ✅ อัปเดต Cache User (เผื่อเขาเปลี่ยนชื่อ หรือเปลี่ยนสถานะ)
                     localStorage.setItem('classfund_user', JSON.stringify(user));
                 } else {
                     // ถ้า User นี้โดนลบไปแล้วจาก Server ให้เคลียร์ทิ้ง
                     localStorage.removeItem('classfund_user');
                     localStorage.removeItem('last_active_user_id');
                 }
            }

            // อัปเดต State อีกครั้งด้วยข้อมูลล่าสุด (ถ้าต่างจาก Cache หน้าจอจะกระพริบนิดนึงเพื่ออัปเดต)
            setAppState({ currentClassroom: classroom, currentUser: user });

        } catch (e) {
            console.error("Critical Initialization Error", e);
            // ถ้า API พัง แต่เรามี Cache เก่าอยู่ User ก็ยังใช้งานต่อได้ (Offline Mode)
        } finally {
            setLoading(false);
        }
    };
    initializeApp();
  }, []);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('last_active_user_id', user._id);
    
    // ✅ (เพิ่ม) จำข้อมูล User ทั้งก้อนไว้เลย คราวหน้าจะได้ไม่ต้องรอโหลด
    localStorage.setItem('classfund_user', JSON.stringify(user)); 
    
    setAppState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    localStorage.removeItem('last_active_user_id');
    
    // ✅ (เพิ่ม) ล้างข้อมูลออก
    localStorage.removeItem('classfund_user'); 
    
    setAppState(prev => ({ ...prev, currentUser: null }));
  };

  useEffect(() => {
    // ตั้งเวลา 5 นาที (หน่วยมิลลิวินาที: 5 * 60 * 1000)
    const TIMEOUT_DURATION = 5 * 60 * 1000; 
    let logoutTimer: NodeJS.Timeout;

    const resetTimer = () => {
      // ถ้าไม่ได้ Login อยู่ ไม่ต้องทำอะไร
      if (!appState.currentUser) return;

      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        console.log("Session Timeout");
        handleLogout(); // เรียกใช้ฟังก์ชัน Logout เดียวกันกับข้างบน
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
  }, [appState.currentUser]); // ทำงานใหม่ทุกครั้งที่สถานะ currentUser เปลี่ยน

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  if (appState.currentClassroom && appState.currentUser) {
    return <Dashboard classroom={appState.currentClassroom} user={appState.currentUser} onLogout={handleLogout} />;
  }

  return <Auth className={appState.currentClassroom?.name || 'ระบบเช็ค/เก็บเงิน'} onLogin={handleLoginSuccess} />;
}

export default App;