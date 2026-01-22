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
  activePeriods?: string[]
  closedPeriods?: string[];
  periodAmounts?: { [key: string]: number }; // จุดสำคัญ
  paymentQrCode?: string;
  announcement?: string;
  announcementDate?: string;
  isPaymentActive?: boolean;
}

export interface AuditLog {
  _id: string;
  userId: string;
  username: string;
  action: string;
  targetType: 'USER' | 'TRANSACTION' | 'CLASSROOM' | 'SETTINGS';
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Customization {
  _id: string;
  classroomId: string;
  theme: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  logo?: string;
  customName?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface UserProfile {
  _id: string;
  userId: string;
  profilePicture?: string;
  bio?: string;
  achievements: string[];
  statistics: {
    totalPaid: number;
    transactionCount: number;
    level: number;
  };
  updatedAt: string;
}

export interface AppState {
  currentClassroom: Classroom | null;
  currentUser: User | null;
}