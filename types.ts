export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  EXPENSE = 'EXPENSE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  _id: string;
  username: string;
  name: string;
  role: UserRole;
  classroomId?: string;
  password?: string;
}

export interface Transaction {
  _id: string;
  classroomId: string;
  userId?: string;
  studentName: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  note?: string;
  period?: string;
  approver?: string;
  slipImage?: string;
  slipHash?: string;
}

export interface Classroom {
  _id: string;
  id: string;
  name: string;
  targetAmount?: number;
  createdAt?: string;
  monthlyFee?: number;
  activePeriods?: string[];
  periodAmounts?: { [key: string]: number }; // จุดสำคัญ
  paymentQrCode?: string;
  announcement?: string;
  announcementDate?: string;
}

export interface AppState {
  currentClassroom: Classroom | null;
  currentUser: User | null;
}