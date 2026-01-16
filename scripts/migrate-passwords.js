import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ไม่พบ MONGODB_URI ใน environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ'))
  .catch(err => {
    console.error('❌ เชื่อมต่อ MongoDB ไม่สำเร็จ:', err);
    process.exit(1);
  });

const User = mongoose.model('User', new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STUDENT'], default: 'STUDENT' },
  classroomId: { type: String, default: 'MAIN' },
  lineUserId: { type: String, default: null }
}, { timestamps: true }));

async function migratePasswords() {
  try {
    console.log('🔄 เริ่มต้น Migration: Hash รหัสผ่านทั้งหมด...\n');

    const users = await User.find({});
    console.log(`📊 พบผู้ใช้ทั้งหมด: ${users.length} คน\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // ตรวจสอบว่ารหัสผ่านถูก hash แล้วหรือยัง (bcrypt hash เริ่มต้นด้วย $2b$)
      if (user.password.startsWith('$2b$')) {
        console.log(`⏭️  ข้าม: ${user.username} (รหัสผ่านถูก hash แล้ว)`);
        skippedCount++;
        continue;
      }

      // Hash รหัสผ่านเดิม
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // อัปเดตในฐานข้อมูล
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      
      console.log(`✅ อัปเดต: ${user.username}`);
      migratedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration เสร็จสิ้น!');
    console.log(`   - อัปเดตแล้ว: ${migratedCount} คน`);
    console.log(`   - ข้ามไป: ${skippedCount} คน`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ migrate:', error);
    process.exit(1);
  }
}

migratePasswords();
