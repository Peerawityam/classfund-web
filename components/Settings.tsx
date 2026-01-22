import React, { useState, useEffect } from 'react';
import { Customization } from '../types';
import * as api from '../services/apiService';
import { Palette, Type, ImageIcon, Save, RotateCcw, Upload, Sparkles } from 'lucide-react';

interface Props {
    classroomId: string;
    userId: string;
    onUpdate?: () => void;
}

const Settings: React.FC<Props> = ({ classroomId, userId, onUpdate }) => {
    const [customization, setCustomization] = useState<Customization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');
    const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
    const [fontFamily, setFontFamily] = useState('Inter');
    const [customName, setCustomName] = useState('');
    const [logo, setLogo] = useState<string | null>(null);

    const fontOptions = [
        'Inter',
        'Roboto',
        'Noto Sans Thai',
        'Prompt',
        'Kanit',
        'Sarabun',
        'Poppins'
    ];

    useEffect(() => {
        loadCustomization();
    }, [classroomId]);

    const loadCustomization = async () => {
        setLoading(true);
        try {
            const data = await api.getCustomization(classroomId);
            setCustomization(data);
            setPrimaryColor(data.theme?.primaryColor || '#3b82f6');
            setSecondaryColor(data.theme?.secondaryColor || '#8b5cf6');
            setFontFamily(data.theme?.fontFamily || 'Inter');
            setCustomName(data.customName || '');
            setLogo(data.logo || null);
        } catch (error) {
            console.error('Failed to load customization:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('ไฟล์ใหญ่เกินไป (สูงสุด 2MB)');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = {
                theme: {
                    primaryColor,
                    secondaryColor,
                    fontFamily
                },
                logo,
                customName,
                updatedBy: userId
            };

            await api.updateCustomization(classroomId, data);
            alert('✅ บันทึกการตั้งค่าเรียบร้อย');

            // Apply theme immediately
            applyTheme();

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to save customization:', error);
            alert('❌ เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('ต้องการรีเซ็ตการตั้งค่าทั้งหมดใช่ไหม?')) return;

        setPrimaryColor('#3b82f6');
        setSecondaryColor('#8b5cf6');
        setFontFamily('Inter');
        setCustomName('');
        setLogo(null);
    };

    const applyTheme = () => {
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--font-family', fontFamily);
    };

    if (loading) {
        return <div className="p-10 text-center text-gray-500">กำลังโหลด...</div>;
    }

    return (
        <div className="p-3 sm:p-6 max-w-4xl mx-auto pb-24 md:pb-8">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 flex items-center gap-2">
                    <Sparkles className="text-purple-500" size={24} />
                    การตั้งค่าระบบ
                </h1>
                <p className="text-sm sm:text-base text-gray-600">ปรับแต่งธีม สี และโลโก้ของระบบ</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
                {/* Theme Colors */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="text-blue-500" size={20} />
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800">ธีมสี</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                สีหลัก (Primary Color)
                            </label>
                            <div className="flex gap-2 sm:gap-3 items-center">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="h-10 sm:h-12 w-16 sm:w-20 rounded border border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                สีรอง (Secondary Color)
                            </label>
                            <div className="flex gap-2 sm:gap-3 items-center">
                                <input
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="h-10 sm:h-12 w-16 sm:w-20 rounded border border-gray-300 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="#8b5cf6"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">ตัวอย่าง:</p>
                        <div className="flex gap-2">
                            <button
                                style={{ backgroundColor: primaryColor }}
                                className="px-3 sm:px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm"
                            >
                                ปุ่มหลัก
                            </button>
                            <button
                                style={{ backgroundColor: secondaryColor }}
                                className="px-3 sm:px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm"
                            >
                                ปุ่มรอง
                            </button>
                        </div>
                    </div>
                </div>

                {/* Font Family */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Type className="text-purple-500" size={20} />
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800">ฟอนต์</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            เลือกฟอนต์
                        </label>
                        <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {fontOptions.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                </option>
                            ))}
                        </select>

                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm" style={{ fontFamily }}>
                            <p className="text-gray-700 mb-1">
                                ตัวอย่างฟอนต์: The quick brown fox jumps over the lazy dog
                            </p>
                            <p className="text-gray-700">
                                ทดสอบภาษาไทย: กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="text-green-500" size={20} />
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800">โลโก้</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            อัปโหลดโลโก้ (สูงสุด 2MB)
                        </label>

                        {logo && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                                <img src={logo} alt="Logo" className="h-16 sm:h-20 object-contain" />
                            </div>
                        )}

                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors text-sm font-medium">
                            <Upload size={18} />
                            เลือกไฟล์
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Custom Name */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Type className="text-orange-500" size={20} />
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800">ชื่อระบบ</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ชื่อที่แสดงในระบบ (ถ้าไม่ระบุจะใช้ชื่อเดิม)
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="เช่น: ระบบเก็บเงินห้อง 4/1"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                        onClick={handleReset}
                        className="px-4 sm:px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <RotateCcw size={18} />
                        รีเซ็ต
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium shadow-sm"
                    >
                        <Save size={18} />
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
