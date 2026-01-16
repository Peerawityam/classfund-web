import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import winston from 'winston';


// --- Logger Setup ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for sensitive endpoints
  message: 'Too many attempts, please try again later.'
});

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/api/', limiter); // Apply rate limiting to all API routes

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isCloudinaryConfigured = () => {
  const conf = cloudinary.config();
  return !!(conf.cloud_name && conf.api_key && conf.api_secret);
};

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ไม่พบ MONGODB_URI ใน environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ');
  })
  .catch(err => {
    console.error('❌ เชื่อมต่อ MongoDB ไม่สำเร็จ');
    console.error(err);
  });

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STUDENT'], default: 'STUDENT' },
  classroomId: { type: String, default: 'MAIN' },
  lineUserId: { type: String, default: null, index: true }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  classroomId: { type: String, default: 'MAIN' },
  userId: { type: String, index: true },
  studentName: String,
  amount: Number,
  type: { type: String, enum: ['DEPOSIT', 'EXPENSE'] },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  date: { type: Date, default: Date.now, index: true },
  note: String,
  period: String,
  approver: String,
  slipImage: String,
  slipHash: { type: String, index: true },
}, { timestamps: true });

const ClassroomSchema = new mongoose.Schema({
  id: { type: String, default: 'MAIN' },
  name: { type: String, default: 'ระบบเก็บ/เช็คเงิน' },
  announcement: { type: String, default: "" },
  announcementDate: { type: Date, default: Date.now },
  monthlyFee: { type: Number, default: 20 },
  activePeriods: [String],
  closedPeriods: { type: [String], default: [] },
  periodAmounts: { type: Map, of: Number },
  paymentQrCode: String,
  isPaymentActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Classroom = mongoose.model('Classroom', ClassroomSchema);

// --- Validation Schemas ---
const TransactionValidation = z.object({
  userId: z.string().optional(),
  studentName: z.string().min(1, 'Student name is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['DEPOSIT', 'EXPENSE']),
  note: z.string().max(500, 'Note too long').optional(),
  period: z.string().optional(),
  slipImage: z.string().optional(),
  slipHash: z.string().optional()
});

const UserValidation = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'STUDENT']).optional()
});

// --- Middleware ---
const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    logger.error('Validation error:', error);
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.errors
    });
  }
};

// --- API Routes ---

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
app.get('/api/init-classroom', async (req, res) => {
  try {
    let classroom = await Classroom.findOne({ id: 'MAIN' });
    if (!classroom) {
      classroom = new Classroom({ id: 'MAIN', name: 'ระบบเก็บ/เช็คเงิน', activePeriods: [] });
      await classroom.save();
    }
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('00189', 10);
      await User.create({ _id: 'admin', username: 'admin', password: hashedPassword, name: 'ผู้ดูแลระบบ', role: 'ADMIN' });
    }
    res.json(classroom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/classroom', async (req, res) => {
  try {
    console.log("📥 Received Update:", req.body);
    if (req.body.paymentQrCode && req.body.paymentQrCode.startsWith('data:image')) {
      const uploadRes = await cloudinary.uploader.upload(req.body.paymentQrCode, { folder: 'classfund_settings' });
      req.body.paymentQrCode = uploadRes.secure_url;
    }
    const updated = await Classroom.findOneAndUpdate({ id: 'MAIN' }, req.body, { new: true });

    console.log("✅ Updated Result:", updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/classroom/announcement', async (req, res) => {
  const { classroomId, text } = req.body;
  try {
    const updated = await Classroom.findByIdAndUpdate(
      classroomId,
      {
        announcement: text,
        announcementDate: new Date()
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', strictLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    logger.info(`User logged in: ${username}`);
    res.json(user);
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users', validateRequest(UserValidation), async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      _id: username,
      username,
      password: hashedPassword,
      name,
      role: role || 'STUDENT'
    };

    const user = new User(userData);
    await user.save();

    logger.info(`New user created: ${username}`);
    res.json(user);
  } catch (err) {
    logger.error('Create user error:', err);
    res.status(400).json({ message: 'ไม่สามารถเพิ่มผู้ใช้ได้ หรือชื่อผู้ใช้นี้มีอยู่แล้ว' });
  }
});

// ✅ API สำหรับเชื่อมต่อ LINE User ID กับบัญชีผู้ใช้
app.post('/api/update-line-id', async (req, res) => {
  const { username, lineUserId } = req.body;

  try {
    // ค้นหา User ตาม username แล้วอัปเดต lineUserId
    const user = await User.findOneAndUpdate(
      { username: username }, // เงื่อนไขค้นหา
      { lineUserId: lineUserId }, // ค่าที่จะแก้
      { new: true } // ให้คืนค่าข้อมูลใหม่กลับมา
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้' });
    }

    console.log(`🔗 เชื่อมต่อ LINE สำเร็จ: ${username} <-> ${lineUserId}`);
    res.json({ success: true, user });

  } catch (err) {
    console.error('Update LINE ID Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ date: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/transactions', validateRequest(TransactionValidation), async (req, res) => {
  try {
    let transactionData = { ...req.body };
    if (transactionData.slipImage && transactionData.slipImage.startsWith('data:image')) {
      if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured');
      const uploadRes = await cloudinary.uploader.upload(transactionData.slipImage, { folder: 'classfund_slips' });
      transactionData.slipImage = uploadRes.secure_url;
    }
    const tx = new Transaction(transactionData);
    await tx.save();
    logger.info(`Transaction created: ${tx._id}`);
    res.json(tx);
  } catch (err) {
    logger.error('Transaction creation error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/transactions/check-slip/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const exists = await Transaction.findOne({ slipHash: hash });
    res.json({ isDuplicate: !!exists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/transactions/:id', async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/broadcast', strictLimiter, async (req, res) => {
  const { message } = req.body;

  // Get LINE Channel Access Token from environment variable
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!CHANNEL_ACCESS_TOKEN) {
    logger.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    return res.status(500).json({ success: false, message: 'LINE integration not configured' });
  }

  try {
    const users = await User.find({ lineUserId: { $ne: null } });
    const userIds = users.map(u => u.lineUserId);

    if (userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีผู้ใช้ที่เชื่อมต่อ LINE' });
    }

    console.log(`📢 กำลังส่งประกาศหา ${userIds.length} คน...`);

    const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userIds,
        messages: [{ type: 'text', text: `📢 ประกาศจาก Admin:\n${message}` }]
      })
    });

    if (response.ok) {
      res.json({ success: true, count: userIds.length });
    } else {
      console.error(await response.json());
      res.status(500).json({ success: false, message: 'ส่งข้อความไม่ผ่าน' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 เซิร์ฟเวอร์รันที่พอร์ต ${PORT}`));