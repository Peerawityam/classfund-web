import React, { useState, useEffect } from 'react';
import { User, UserProfile as UserProfileType, Transaction, TransactionStatus } from '../types';
import * as api from '../services/apiService';
import { Camera, Edit2, Save, X, Trophy, Zap, Star, Crown, Medal, TrendingUp, Award, Target } from 'lucide-react';

interface Props {
    user: User;
    transactions: Transaction[];
    onUpdate?: () => void;
}

const UserProfile: React.FC<Props> = ({ user, transactions, onUpdate }) => {
    const [profile, setProfile] = useState<UserProfileType | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [bio, setBio] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, [user._id]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const data = await api.getUserProfile(user._id);
            setProfile(data);
            setBio(data.bio || '');
            setProfilePicture(data.profilePicture || null);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStatistics = () => {
        const userTxs = transactions.filter(
            tx => tx.userId === user._id && tx.status === TransactionStatus.APPROVED
        );

        const totalPaid = userTxs
            .filter(tx => tx.type === 'DEPOSIT')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const transactionCount = userTxs.length;

        // Calculate level based on total paid
        const xp = totalPaid * 10;
        let level = 1;
        if (xp >= 12000) level = 5;
        else if (xp >= 8000) level = 4;
        else if (xp >= 4000) level = 3;
        else if (xp >= 1000) level = 2;

        return { totalPaid, transactionCount, level };
    };

    const getBadges = () => {
        const stats = calculateStatistics();
        const badges = [];

        if (stats.totalPaid > 0) {
            badges.push({
                id: 'first_payment',
                icon: <Zap size={20} />,
                name: 'เปิดบิลแรก',
                color: 'bg-yellow-100 text-yellow-700 border-yellow-300'
            });
        }
        if (stats.totalPaid >= 500) {
            badges.push({
                id: 'supporter',
                icon: <Star size={20} />,
                name: 'ผู้สนับสนุน',
                color: 'bg-blue-100 text-blue-700 border-blue-300'
            });
        }
        if (stats.totalPaid >= 1000) {
            badges.push({
                id: 'whale',
                icon: <Crown size={20} />,
                name: 'สายเปย์',
                color: 'bg-purple-100 text-purple-700 border-purple-300'
            });
        }
        if (stats.transactionCount >= 5) {
            badges.push({
                id: 'consistent',
                icon: <Medal size={20} />,
                name: 'จ่ายสม่ำเสมอ',
                color: 'bg-green-100 text-green-700 border-green-300'
            });
        }
        if (stats.totalPaid >= 2000) {
            badges.push({
                id: 'legend',
                icon: <Trophy size={20} />,
                name: 'ตำนาน',
                color: 'bg-rose-100 text-rose-700 border-rose-300'
            });
        }

        return badges;
    };

    const getLevelInfo = (level: number) => {
        const levels = [
            { level: 1, title: 'เด็กใหม่', icon: <Target size={20} />, color: 'bg-gray-400', nextXp: 1000 },
            { level: 2, title: 'ผู้ช่วยห้อง', icon: <Medal size={20} />, color: 'bg-amber-600', nextXp: 4000 },
            { level: 3, title: 'เศรษฐีประจำห้อง', icon: <Star size={20} />, color: 'bg-slate-400', nextXp: 8000 },
            { level: 4, title: 'ป๋าเปย์ตัวจริง', icon: <Crown size={20} />, color: 'bg-yellow-400', nextXp: 12000 },
            { level: 5, title: 'ตำนานแห่ง ClassFund', icon: <Trophy size={20} />, color: 'bg-rose-500', nextXp: 15000 }
        ];
        return levels[level - 1] || levels[0];
    };

    const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const stats = calculateStatistics();
            const badges = getBadges().map(b => b.id);

            const data = {
                profilePicture,
                bio,
                achievements: badges,
                statistics: stats
            };

            await api.updateUserProfile(user._id, data);
            alert('✅ บันทึกโปรไฟล์เรียบร้อย');
            setEditing(false);
            loadProfile();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('❌ เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">กำลังโหลด...</div>;
    }

    const stats = calculateStatistics();
    const levelInfo = getLevelInfo(stats.level);
    const badges = getBadges();
    const currentXp = stats.totalPaid * 10;
    const progress = ((currentXp % levelInfo.nextXp) / levelInfo.nextXp) * 100;

    return (
        <div className="p-3 sm:p-6 max-w-4xl mx-auto pb-24 md:pb-8">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 flex items-center gap-2">
                    <Award className="text-blue-500" size={24} />
                    โปรไฟล์ผู้ใช้
                </h1>
                <p className="text-sm sm:text-base text-gray-600">ข้อมูลส่วนตัวและความสำเร็จของคุณ</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
                                {profilePicture ? (
                                    <img src={profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl sm:text-4xl text-white font-bold">
                                        {user.name.charAt(0)}
                                    </span>
                                )}
                            </div>
                            {editing && (
                                <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors shadow-lg">
                                    <Camera size={18} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePictureUpload}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                        <h2 className="mt-3 text-lg sm:text-xl font-bold text-gray-800">{user.name}</h2>
                        <p className="text-xs sm:text-sm text-gray-500">{user.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'นักเรียน'}</p>
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                        {/* Level Progress */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-white text-xs sm:text-sm font-medium ${levelInfo.color} flex items-center gap-1.5 shadow-sm`}>
                                    {levelInfo.icon}
                                    <span>Level {stats.level} - {levelInfo.title}</span>
                                </span>
                                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                                    {currentXp} / {levelInfo.nextXp} XP
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden shadow-inner">
                                <div
                                    className={`h-full ${levelInfo.color} transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="mb-4">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                เกี่ยวกับฉัน
                            </label>
                            {editing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                                    placeholder="เขียนอะไรสักหน่อยเกี่ยวกับตัวคุณ... (สูงสุด 200 ตัวอักษร)"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={3}
                                />
                            ) : (
                                <p className="text-sm text-gray-700">
                                    {bio || 'ยังไม่ได้เขียนอะไร...'}
                                </p>
                            )}
                            {editing && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {bio.length} / 200 ตัวอักษร
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {editing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium shadow-sm"
                                    >
                                        <Save size={18} />
                                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setBio(profile?.bio || '');
                                            setProfilePicture(profile?.profilePicture || null);
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <X size={18} />
                                        ยกเลิก
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
                                >
                                    <Edit2 size={18} />
                                    แก้ไขโปรไฟล์
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm opacity-90 font-medium">ยอดจ่ายทั้งหมด</span>
                        <TrendingUp size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.totalPaid.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm opacity-75">บาท</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm opacity-90 font-medium">จำนวนครั้ง</span>
                        <Star size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.transactionCount}</p>
                    <p className="text-xs sm:text-sm opacity-75">รายการ</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm opacity-90 font-medium">ระดับ</span>
                        <Trophy size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.level}</p>
                    <p className="text-xs sm:text-sm opacity-75">{levelInfo.title}</p>
                </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    ความสำเร็จ ({badges.length})
                </h3>

                {badges.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                        ยังไม่มีความสำเร็จ เริ่มจ่ายเงินเพื่อปลดล็อกความสำเร็จ!
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {badges.map((badge) => (
                            <div
                                key={badge.id}
                                className={`flex flex-col items-center p-3 sm:p-4 rounded-lg border-2 ${badge.color} transition-transform hover:scale-105 shadow-sm`}
                            >
                                <div className="mb-2">{badge.icon}</div>
                                <span className="text-xs font-medium text-center">{badge.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;
