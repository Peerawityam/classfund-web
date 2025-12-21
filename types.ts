
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
}

export interface User {
  _id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  classroomId: string;
  createdAt?: string;
}

export interface Transaction {
  _id?: string;
  // _id: string;
  classroomId: string;
  userId?: string;
  studentName: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  note: string;
  approver?: string;
  slipImage?: string;
  period?: string;
}

export interface Classroom {
  _id: string;
  id: string; // ใช้สำหรับระบุห้องหลัก เช่น 'MAIN'
  name: string;
  targetAmount?: number;
  createdAt?: string;
  monthlyFee?: number;
  activePeriods?: string[];
  paymentQrCode?: string;
}

export interface AppState {
  currentClassroom: Classroom | null;
  currentUser: User | null;
}
