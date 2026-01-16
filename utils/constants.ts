// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Cloudinary Configuration
export const CLOUDINARY_CLOUD_NAME = 'dfztd6dye';
export const CLOUDINARY_UPLOAD_PRESET = 'classfund_preset';

// Timeouts
export const AUTO_LOGOUT_DURATION = 5 * 60 * 1000; // 5 minutes
export const DEBOUNCE_DELAY = 300; // milliseconds

// File Upload Limits
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Gamification Levels
export const LEVELS = [
    { level: 1, title: 'เด็กใหม่ 🐣', xpRequired: 0, nextXp: 1000, color: 'bg-gray-400' },
    { level: 2, title: 'ผู้ช่วยห้อง 🥉', xpRequired: 1000, nextXp: 4000, color: 'bg-amber-600' },
    { level: 3, title: 'เศรษฐีประจำห้อง 🥈', xpRequired: 4000, nextXp: 8000, color: 'bg-slate-400' },
    { level: 4, title: 'ป๋าเปย์ตัวจริง 🥇', xpRequired: 8000, nextXp: 12000, color: 'bg-yellow-400' },
    { level: 5, title: 'ตำนานแห่ง ClassFund 💎', xpRequired: 12000, nextXp: 15000, color: 'bg-rose-500' },
];

// Badge Definitions
export const BADGE_DEFINITIONS = [
    { id: 'first_blood', name: 'เปิดบิลแรก', minAmount: 0, minCount: 1, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'supporter', name: 'ผู้สนับสนุน', minAmount: 500, minCount: 0, color: 'bg-blue-100 text-blue-700' },
    { id: 'whale', name: 'สายเปย์', minAmount: 1000, minCount: 0, color: 'bg-purple-100 text-purple-700' },
    { id: 'consistent', name: 'จ่ายสม่ำเสมอ', minAmount: 0, minCount: 5, color: 'bg-green-100 text-green-700' },
];

// Transaction Status Colors
export const STATUS_COLORS = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
};

// Quick Tags for Payment Notes
export const QUICK_TAGS = [
    'ค่าห้อง',
    'ค่าอาหาร',
    'ค่ากิจกรรม',
    'ค่าทัศนศึกษา',
    'ค่าเครื่องแบบ',
    'อื่นๆ',
];
