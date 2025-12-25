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
  classroomId: { type: String, default: 'MAIN' },

  lineUserId: { type: String, default: null }
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
  announcement: { type: String, default: "" },
  announcementDate: { type: Date, default: Date.now },
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

app.post('/api/broadcast', async (req, res) => {
  const { message } = req.body;
  
  // 👇 เอา Access Token ยาวๆ จากขั้นตอนที่ 1 มาใส่ตรงนี้
  const CHANNEL_ACCESS_TOKEN = '6bf50dd70b518a554e5ff591fcd4e8f2'; 

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