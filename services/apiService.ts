
/// <reference types="vite/client" />
import { Classroom, Transaction, TransactionStatus, User, UserRole } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const localStore = {
  get: <T>(key: string, fallback: T): T => {
    const data = localStorage.getItem(`mock_${key}`);
    return data ? JSON.parse(data) : fallback;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(`mock_${key}`, JSON.stringify(value));
  }
};

async function request<T>(
  path: string,
  options: RequestInit,
  fallbackAction: () => T | Promise<T>
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized');
      const err = await res.json();
      throw new Error(err.message || 'Server Error');
    }
    return await res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn(`⚠️ Running in Local Mock Mode.`);
      return await fallbackAction();
    }
    throw error;
  }
}

export const initClassroom = async (): Promise<Classroom> => {
  return request<Classroom>('/init-classroom', { method: 'GET' }, () => {
    const existing = localStore.get<Classroom | null>('classroom', null);
    if (existing) return existing;
    const defaultRoom: Classroom = { _id: 'main_room_mock', id: 'MAIN', name: 'ระบบเช็คเงินห้อง', activePeriods: [], monthlyFee: 20 };
    localStore.set('classroom', defaultRoom);
    return defaultRoom;
  });
};

export const login = async (username: string, password: string): Promise<User | null> => {
  return request<User | null>('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }, () => {
    const users = localStore.get<User[]>('users', []);
    if (users.length === 0 && username === 'admin' && password === '00189') {
      return { _id: 'admin', username: 'admin', name: 'ผู้ดูแลระบบ', role: UserRole.ADMIN, classroomId: 'MAIN' };
    }
    return users.find(u => u.username === username && u.password === password) || null;
  });
};

export const updateClassroom = async (classroom: Classroom): Promise<Classroom> => {
  return request<Classroom>('/classroom', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classroom)
  }, () => {
    localStore.set('classroom', classroom);
    return classroom;
  });
};

export const getUsers = async (): Promise<User[]> => {
  return request<User[]>('/users', { method: 'GET' }, () => {
    return localStore.get<User[]>('users', []);
  });
};

export const addUser = async (userData: Partial<User>): Promise<User> => {
  return request<User>('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  }, () => {
    const users = localStore.get<User[]>('users', []);
    if (users.some(u => u.username === userData.username)) throw new Error('ชื่อผู้ใช้นี้มีในระบบแล้ว');
    // Important: Use username as _id
    const newUser = { ...userData, _id: userData.username } as User;
    localStore.set('users', [...users, newUser]);
    return newUser;
  });
};

export const deleteUser = async (id: string): Promise<void> => {
  return request<void>(`/users/${id}`, { method: 'DELETE' }, () => {
    const users = localStore.get<User[]>('users', []);
    localStore.set('users', users.filter(u => u._id !== id));
  });
};

export const clearAllStudents = async (): Promise<void> => {
  return request<void>('/users/clear-students', { method: 'POST' }, () => {
    const users = localStore.get<User[]>('users', []);
    localStore.set('users', users.filter(u => u.role !== UserRole.STUDENT));
  });
};

export const getTransactions = async (): Promise<Transaction[]> => {
  return request<Transaction[]>('/transactions', { method: 'GET' }, () => {
    return localStore.get<Transaction[]>('transactions', []);
  });
};

export const addTransaction = async (txData: Partial<Transaction>): Promise<Transaction> => {
  return request<Transaction>('/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(txData)
  }, () => {
    const txs = localStore.get<Transaction[]>('transactions', []);
    const newTx = { ...txData, _id: 'tx_' + Date.now() } as Transaction;
    localStore.set('transactions', [newTx, ...txs]);
    return newTx;
  });
};

export const checkSlipDuplicate = async (hash: string) => {
  // สมมติว่า base URL คือ http://localhost:3001
  const response = await fetch(`${API_BASE}/transactions/check-slip/${hash}`);
  if (!response.ok) {
    // ถ้าหลังบ้านยังไม่ทำ API นี้ ให้ return false ไปก่อนเพื่อกัน Error หน้าเว็บ
    return { isDuplicate: false };
  }
  return response.json();
};

export const updateTransactionStatus = async (id: string, status: TransactionStatus, approver: string): Promise<Transaction> => {
  return request<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, approver })
  }, () => {
    const txs = localStore.get<Transaction[]>('transactions', []);
    const updated = txs.map(t => t._id === id ? { ...t, status, approver } : t);
    localStore.set('transactions', updated);
    return updated.find(t => t._id === id)!;
  });
};

export const calculateBalance = (
  txs: Transaction[],
  userId?: string,
  mode: 'NET' | 'INCOME' | 'EXPENSE' = 'NET'
): number => {

  // 1. Safety Check
  if (!Array.isArray(txs)) {
    console.error('❌ [CalcBalance] Error: txs is not an array!', txs);
    return 0;
  }

  const result = txs
    // 2. กรอง Status
    .filter(t => {
      const isApproved = String(t.status || '').toUpperCase() === 'APPROVED';
      return isApproved;
    })

    // 3. กรอง User
    .filter(t => {
      const matchUser = !userId || String(t.userId) === String(userId);
      return matchUser;
    })

    .reduce((acc, curr) => {
      // 4. แปลงค่าเงิน
      const amount = Math.abs(Number(curr.amount) || 0);

      // 5. จัดการประเภท
      const typeStr = String(curr.type || '').trim().toUpperCase();

      // 6. กำหนดหมวดหมู่
      const incomeTypes = ['DEPOSIT', 'INCOME', '0'];
      const isDeposit = incomeTypes.includes(typeStr);

      // 7. คำนวณตาม Mode
      switch (mode) {
        case 'INCOME':
          return isDeposit ? acc + amount : acc;

        case 'EXPENSE':
          return !isDeposit ? acc + amount : acc;

        case 'NET':
        default:
          return isDeposit ? acc + amount : acc - amount;
      }
    }, 0);


  return result;
};

export const updateTransaction = async (id: string, data: any) => {
  const response = await fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update transaction');
  }
  return response.json();
};

export const updateAnnouncement = async (classroomId: string, text: string) => {
  const response = await fetch(`${API_BASE}/classroom/announcement`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classroomId, text }),
  });

  if (!response.ok) {
    throw new Error('Failed to update announcement');
  }

  return response.json();
};

// --- Audit Log API ---
export const getAuditLogs = async (filters?: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }

  const response = await fetch(`${API_BASE}/audit-logs?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
};

// --- Customization API ---
export const getCustomization = async (classroomId: string) => {
  const response = await fetch(`${API_BASE}/customization/${classroomId}`);
  if (!response.ok) throw new Error('Failed to fetch customization');
  return response.json();
};

export const updateCustomization = async (classroomId: string, data: any) => {
  const response = await fetch(`${API_BASE}/customization/${classroomId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update customization');
  return response.json();
};

// --- User Profile API ---
export const getUserProfile = async (userId: string) => {
  const response = await fetch(`${API_BASE}/profile/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
};

export const updateUserProfile = async (userId: string, data: any) => {
  const response = await fetch(`${API_BASE}/profile/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update user profile');
  return response.json();
};