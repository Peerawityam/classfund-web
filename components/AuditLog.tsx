import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import * as api from '../services/apiService';
import { Search, Filter, Download, Clock, User, FileText, Settings, LogIn, UserPlus, UserMinus, CheckCircle, XCircle, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const AuditLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedTargetType, setSelectedTargetType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const filters: any = { page, limit: 20 };
            if (searchTerm) filters.search = searchTerm;
            if (selectedAction) filters.action = selectedAction;
            if (selectedTargetType) filters.targetType = selectedTargetType;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const response = await api.getAuditLogs(filters);
            setLogs(response.logs);
            setTotalPages(response.totalPages);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, selectedAction, selectedTargetType, startDate, endDate]);

    const handleSearch = () => {
        setPage(1);
        fetchLogs();
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedAction('');
        setSelectedTargetType('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const exportToExcel = () => {
        const data = logs.map(log => ({
            'วันที่/เวลา': new Date(log.timestamp).toLocaleString('th-TH'),
            'ผู้ใช้': log.username,
            'การกระทำ': log.action,
            'ประเภท': log.targetType,
            'รายละเอียด': log.details,
            'IP Address': log.ipAddress || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
        XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn size={16} className="text-blue-500" />;
        if (action.includes('CREATE')) return <UserPlus size={16} className="text-green-500" />;
        if (action.includes('DELETE')) return <UserMinus size={16} className="text-red-500" />;
        if (action.includes('APPROVE')) return <CheckCircle size={16} className="text-emerald-500" />;
        if (action.includes('REJECT')) return <XCircle size={16} className="text-orange-500" />;
        if (action.includes('UPDATE') || action.includes('CUSTOMIZATION')) return <Edit size={16} className="text-purple-500" />;
        if (action.includes('TRANSACTION')) return <FileText size={16} className="text-blue-500" />;
        if (action.includes('USER')) return <User size={16} className="text-purple-500" />;
        if (action.includes('SETTINGS')) return <Settings size={16} className="text-orange-500" />;
        return <Clock size={16} className="text-gray-500" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-600 bg-red-50 border-red-200';
        if (action.includes('CREATE')) return 'text-green-600 bg-green-50 border-green-200';
        if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (action.includes('LOGIN')) return 'text-purple-600 bg-purple-50 border-purple-200';
        if (action.includes('APPROVE')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (action.includes('REJECT')) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    return (
        <div className="p-3 sm:p-6 max-w-7xl mx-auto pb-24 md:pb-8">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">ประวัติการใช้งานระบบ</h1>
                <p className="text-sm sm:text-base text-gray-600">บันทึกการกระทำทั้งหมดในระบบ ({total} รายการ)</p>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
                <div className="flex flex-col gap-2 sm:gap-3">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาผู้ใช้หรือรายละเอียด..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={handleSearch}
                            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                            ค้นหา
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 font-medium"
                        >
                            <Filter size={16} />
                            <span className="hidden sm:inline">ตัวกรอง</span>
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1 font-medium"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">การกระทำ</label>
                            <select
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="LOGIN">Login</option>
                                <option value="CREATE_USER">สร้างผู้ใช้</option>
                                <option value="DELETE_USER">ลบผู้ใช้</option>
                                <option value="APPROVE_TRANSACTION">อนุมัติรายการ</option>
                                <option value="REJECT_TRANSACTION">ปฏิเสธรายการ</option>
                                <option value="UPDATE_CUSTOMIZATION">แก้ไขการตั้งค่า</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                            <select
                                value={selectedTargetType}
                                onChange={(e) => setSelectedTargetType(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">ทั้งหมด</option>
                                <option value="USER">ผู้ใช้</option>
                                <option value="TRANSACTION">รายการเงิน</option>
                                <option value="CLASSROOM">ห้องเรียน</option>
                                <option value="SETTINGS">การตั้งค่า</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-4">
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                            >
                                ล้างตัวกรองทั้งหมด
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table/Cards */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">กำลังโหลด...</div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">ไม่พบข้อมูล</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            วันที่/เวลา
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ผู้ใช้
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            การกระทำ
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ประเภท
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            รายละเอียด
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs">
                                                        {new Date(log.timestamp).toLocaleString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {log.username}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    <span className="whitespace-nowrap">{log.action.replace(/_/g, ' ')}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                    {log.targetType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {logs.map((log) => (
                                <div key={log._id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 mb-1 truncate">{log.username}</div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Clock size={12} className="flex-shrink-0" />
                                                <span>
                                                    {new Date(log.timestamp).toLocaleString('th-TH', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getActionColor(log.action)}`}>
                                            {getActionIcon(log.action)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2 line-clamp-2">{log.details}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                                            {log.targetType}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-3 sm:px-4 py-3 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs sm:text-sm text-gray-600">
                                หน้า {page} จาก {totalPages} (ทั้งหมด {total} รายการ)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <ChevronLeft size={16} />
                                    <span className="hidden sm:inline">ก่อนหน้า</span>
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    <span className="hidden sm:inline">ถัดไป</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogViewer;
