import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v2 as cloudinary } from 'cloudinary'; 

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

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
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STUDENT'], default: 'STUDENT' },
  classroomId: { type: String, default: 'MAIN' }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  classroomId: { type: String, default: 'MAIN' },
  userId: String,
  studentName: String,
  amount: Number,
  type: { type: String, enum: ['DEPOSIT', 'EXPENSE'] },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  date: { type: Date, default: Date.now },
  note: String,
  period: String,
  approver: String,
  slipImage: String,
  slipHash: { type: String, index: true },
}, { timestamps: true });

const ClassroomSchema = new mongoose.Schema({
  id: { type: String, default: 'MAIN' },
  name: { type: String, default: 'ระบบเก็บ/เช็คเงิน' },
  monthlyFee: { type: Number, default: 20 },
  activePeriods: [String],
  periodAmounts: { type: Map, of: Number }, // จุดสำคัญ: เก็บราคารอบ
  paymentQrCode: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Classroom = mongoose.model('Classroom', ClassroomSchema);

// --- API Routes ---
app.get('/api/init-classroom', async (req, res) => {
  try {
    let classroom = await Classroom.findOne({ id: 'MAIN' });
    if (!classroom) {
      classroom = new Classroom({ id: 'MAIN', name: 'ระบบเก็บ/เช็คเงิน', activePeriods: [] });
      await classroom.save();
    }
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create({ _id: 'admin', username: 'admin', password: '00189', name: 'ผู้ดูแลระบบ', role: 'ADMIN' });
    }
    res.json(classroom);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/classroom', async (req, res) => {
  try {
    if (req.body.paymentQrCode && req.body.paymentQrCode.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(req.body.paymentQrCode, { folder: 'classfund_settings' });
        req.body.paymentQrCode = uploadRes.secure_url;
    }
    const updated = await Classroom.findOneAndUpdate({ id: 'MAIN' }, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (user) res.json(user);
    else res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  } catch (err) {
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

app.post('/api/users', async (req, res) => {
  try {
    const userData = { ...req.body, _id: req.body.username };
    const user = new User(userData);
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'ไม่สามารถเพิ่มผู้ใช้ได้ หรือชื่อผู้ใช้นี้มีอยู่แล้ว' });
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

app.post('/api/transactions', async (req, res) => {
  try {
    let transactionData = { ...req.body };
    if (transactionData.slipImage && transactionData.slipImage.startsWith('data:image')) {
        if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured');
        const uploadRes = await cloudinary.uploader.upload(transactionData.slipImage, { folder: 'classfund_slips' });
        transactionData.slipImage = uploadRes.secure_url;
    }
    const tx = new Transaction(transactionData);
    await tx.save();
    res.json(tx);
  } catch (err) {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 เซิร์ฟเวอร์รันที่พอร์ต ${PORT}`));