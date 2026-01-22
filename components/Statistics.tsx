import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, Clock } from 'lucide-react';
import { Transaction, TransactionStatus, TransactionType } from '../types';

interface StatisticsProps {
    transactions: Transaction[];
    totalStudents: number;
}

const Statistics: React.FC<StatisticsProps> = ({ transactions, totalStudents }) => {
    // Calculate statistics
    const approvedTransactions = transactions.filter(t => t.status === TransactionStatus.APPROVED);

    const totalIncome = approvedTransactions
        .filter(t => t.type === TransactionType.DEPOSIT)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = approvedTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    const pendingCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;

    const approvalRate = transactions.length > 0
        ? ((approvedTransactions.length / transactions.length) * 100).toFixed(1)
        : '0';

    const stats = [
        {
            label: 'ยอดคงเหลือ',
            value: `฿${balance.toLocaleString()}`,
            icon: DollarSign,
            color: 'emerald',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            trend: balance > 0 ? 'up' : 'down'
        },
        {
            label: 'รายรับทั้งหมด',
            value: `฿${totalIncome.toLocaleString()}`,
            icon: TrendingUp,
            color: 'blue',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            trend: 'up'
        },
        {
            label: 'รายจ่ายทั้งหมด',
            value: `฿${totalExpense.toLocaleString()}`,
            icon: TrendingDown,
            color: 'orange',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            iconColor: 'text-orange-600 dark:text-orange-400',
            trend: 'down'
        },
        {
            label: 'รออนุมัติ',
            value: pendingCount.toString(),
            icon: Clock,
            color: 'yellow',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
            trend: null
        },
        {
            label: 'อัตราอนุมัติ',
            value: `${approvalRate}%`,
            icon: CheckCircle,
            color: 'green',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            iconColor: 'text-green-600 dark:text-green-400',
            trend: null
        },
        {
            label: 'จำนวนนักเรียน',
            value: totalStudents.toString(),
            icon: Users,
            color: 'purple',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            iconColor: 'text-purple-600 dark:text-purple-400',
            trend: null
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                            </div>
                            <div className={`${stat.bgColor} p-3 rounded-full`}>
                                <Icon className={`${stat.iconColor}`} size={24} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Statistics;
