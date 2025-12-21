
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
        try {
            const classroom = await api.initClassroom();
            const savedUserId = localStorage.getItem('last_active_user_id');
            let user: User | null = null;
            
            if (savedUserId) {
                 const users = await api.getUsers();
                 user = users.find(u => u._id === savedUserId) || null;
            }

            setAppState({ currentClassroom: classroom, currentUser: user });
        } catch (e) {
            console.error("Critical Initialization Error", e);
        } finally {
            setLoading(false);
        }
    };
    initializeApp();
  }, []);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('last_active_user_id', user._id);
    setAppState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    localStorage.removeItem('last_active_user_id');
    setAppState(prev => ({ ...prev, currentUser: null }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  if (appState.currentClassroom && appState.currentUser) {
    return <Dashboard classroom={appState.currentClassroom} user={appState.currentUser} onLogout={handleLogout} />;
  }

  return <Auth className={appState.currentClassroom?.name || 'ระบบเช็ค/เก็บเงิน'} onLogin={handleLoginSuccess} />;
}

export default App;
