<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 💰 ClassFund - ระบบจัดการเงินห้องเรียน

ระบบจัดการเงินห้องเรียนแบบครบวงจร พร้อมระบบตรวจสอบสลิปอัตโนมัติด้วย AI และการแจ้งเตือนผ่าน LINE

## ✨ Features

### 🎯 สำหรับนักเรียน
- 📱 แจ้งโอนเงินพร้อมแนบสลิป
- 🤖 ตรวจสอบยอดเงินอัตโนมัติด้วย Google Gemini AI
- 📊 ตรวจสอบประวัติการชำระเงิน
- 🏆 ระบบ Gamification (เลเวล, แบดจ์)
- 🔔 รับการแจ้งเตือนผ่าน LINE

### 👨‍🏫 สำหรับผู้ดูแล (Admin)
- ✅ อนุมัติ/ปฏิเสธรายการโอนเงิน
- 👥 จัดการข้อมูลนักเรียน
- 📅 จัดการรอบการเก็บเงิน
- 📢 ส่งประกาศผ่าน LINE Broadcast
- 📈 ดูสรุปยอดเงินและส่งออก Excel
- 💳 อัปโหลด QR Code พร้อมเพย์

### 🔒 ความปลอดภัย
- 🔐 เข้ารหัสรหัสผ่านด้วย bcrypt
- 🛡️ Rate limiting ป้องกัน spam
- ✅ Input validation ด้วย Zod
- 📝 Logging ด้วย Winston
- 🚫 ป้องกันสลิปซ้ำด้วย SHA-256 hash

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 หรือสูงกว่า)
- **MongoDB Atlas** account
- **Cloudinary** account (สำหรับเก็บรูปภาพ)
- **Google Gemini API** key (สำหรับ AI)
- **LINE Developers** account (optional - สำหรับ LINE integration)

### Installation

1. **Clone repository**
```bash
git clone <your-repo-url>
cd classfund
```

2. **ติดตั้ง dependencies**
```bash
npm install
```

3. **ตั้งค่า Environment Variables**

สร้างไฟล์ `.env` จาก template:
```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ให้ครบถ้วน:
```bash
# Server
PORT=3001

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# LINE Integration
LINE_CHANNEL_ACCESS_TOKEN=your_line_token

# Google Gemini AI
VITE_GEMINI_API_KEY=your_gemini_key

# Frontend API URL
VITE_API_URL=http://localhost:3001/api
```

4. **Migrate รหัสผ่าน (สำหรับ database ที่มีอยู่แล้ว)**

> ⚠️ **สำคัญ:** ถ้าคุณมีข้อมูลผู้ใช้อยู่แล้ว ต้องรัน migration script เพื่อ hash รหัสผ่าน

```bash
node scripts/migrate-passwords.js
```

5. **รันโปรเจค**

**Development mode** (รัน backend + frontend พร้อมกัน):
```bash
npm run dev
```

**Production mode**:
```bash
# Build frontend
npm run build

# Start server
npm start
```

6. **เข้าใช้งาน**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

## 📁 Project Structure

```
classfund/
├── components/          # React components
│   ├── Auth.tsx        # หน้า Login
│   ├── Dashboard.tsx   # หน้าหลัก
│   ├── TransactionForm.tsx
│   ├── TransactionList.tsx
│   ├── UserManagement.tsx
│   └── ...
├── services/           # API & Services
│   ├── apiService.ts   # API calls
│   └── geminiService.ts # AI slip analysis
├── scripts/            # Utility scripts
│   └── migrate-passwords.js
├── server.js           # Express backend
├── App.tsx             # Main React app
├── types.ts            # TypeScript types
└── .env.example        # Environment template
```

---

## 🔐 Security Features

### Password Hashing
รหัสผ่านทั้งหมดถูกเข้ารหัสด้วย **bcrypt** (10 rounds)

### Rate Limiting
- **General API**: 100 requests / 15 minutes
- **Login & Broadcast**: 10 requests / 15 minutes

### Input Validation
ใช้ **Zod** ตรวจสอบข้อมูลก่อนบันทึกลง database

### Duplicate Slip Prevention
ใช้ SHA-256 hash ป้องกันการใช้สลิปซ้ำ

---

## 🛠️ API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/init-classroom` - Initialize classroom
- `POST /api/login` - Login (rate limited)

### Protected Endpoints
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `DELETE /api/users/:id` - Delete user
- `GET /api/transactions` - Get transactions
- `POST /api/transactions` - Create transaction
- `PATCH /api/transactions/:id` - Update transaction
- `POST /api/broadcast` - Send LINE broadcast (rate limited)

---

## 🎨 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Lucide React** - Icons
- **XLSX** - Excel export

### Backend
- **Node.js + Express** - Server
- **MongoDB + Mongoose** - Database
- **bcrypt** - Password hashing
- **Zod** - Validation
- **Winston** - Logging
- **express-rate-limit** - Rate limiting

### Cloud Services
- **MongoDB Atlas** - Database hosting
- **Cloudinary** - Image storage
- **Google Gemini 2.5 Flash** - AI slip analysis
- **LINE Messaging API** - Notifications

### PWA
- **Vite PWA Plugin** - Progressive Web App support

---

## 📱 LINE Integration Setup

1. สร้าง LINE Messaging API Channel ที่ [LINE Developers](https://developers.line.biz/)
2. เปิดใช้งาน LIFF (LINE Front-end Framework)
3. คัดลอก Channel Access Token ใส่ใน `.env`
4. ผู้ใช้สามารถเชื่อมต่อบัญชีผ่านหน้า "เชื่อมต่อ LINE"

---

## 🔧 Troubleshooting

### ปัญหา: Login ไม่ได้หลัง migrate passwords
**วิธีแก้:** ตรวจสอบว่ารัน `node scripts/migrate-passwords.js` เรียบร้อยแล้ว

### ปัญหา: AI ไม่ทำงาน
**วิธีแก้:** ตรวจสอบว่า `VITE_GEMINI_API_KEY` ถูกต้องและมี quota เหลืออยู่

### ปัญหา: รูปภาพอัปโหลดไม่ได้
**วิธีแก้:** ตรวจสอบ Cloudinary credentials ใน `.env`

### ปัญหา: LINE broadcast ไม่ทำงาน
**วิธีแก้:** ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN` และให้ผู้ใช้เชื่อมต่อ LINE ก่อน

---

## 📝 Default Admin Account

**Username:** `admin`  
**Password:** `00189`

> ⚠️ **สำคัญ:** เปลี่ยนรหัสผ่าน admin ทันทีหลังติดตั้ง!

---

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Credits

- Built with ❤️ for classroom management
- AI powered by Google Gemini
- Icons by Lucide React

---

## 📞 Support

หากพบปัญหาหรือมีคำถาม กรุณาเปิด [Issue](https://github.com/your-repo/issues) ใน GitHub

---

**Made with 💚 by ClassFund Team**
