import React, { useMemo } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Transaction, TransactionStatus, TransactionType, User } from '../types';

interface TopContributorsProps {
    transactions: Transaction[];
    users: User[];
}

const TopContributors: React.FC<TopContributorsProps> = ({ transactions, users }) => {
    const topContributors = useMemo(() => {
        // Calculate contribution stats for each user
        const userStats = users.map(user => {
            const userTransactions = transactions.filter(
                t => t.userId === user._id &&
                    t.status === TransactionStatus.APPROVED &&
                    t.type === TransactionType.DEPOSIT
            );

            const totalAmount = userTransactions.reduce((sum, t) => sum + t.amount, 0);
            const totalPayments = userTransactions.length;

            // Calculate on-time payments (assuming transactions within period are on-time)
            const onTimePayments = userTransactions.length; // Simplified for now
            const onTimeRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;

            return {
                user,
                totalAmount,
                totalPayments,
                onTimeRate
            };
        });

        // Sort by total amount and get top 10
        return userStats
            .filter(s => s.totalAmount > 0)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 10);
    }, [transactions, users]);

    const getMedalIcon = (rank: number) => {
        switch (rank) {
            case 0:
                return <Trophy className="text-yellow-500" size={24} />;
            case 1:
                return <Medal className="text-gray-400" size={24} />;
            case 2:
                return <Award className="text-orange-600" size={24} />;
            default:
                return <span className="text-gray-500 font-bold text-lg">#{rank + 1}</span>;
        }
    };

    if (topContributors.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🏆 นักเรียนที่ชำระเงินดีเด่น</h3>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    ยังไม่มีข้อมูลการชำระเงิน
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🏆 นักเรียนที่ชำระเงินดีเด่น</h3>
            <div className="space-y-3">
                {topContributors.map((contributor, index) => (
                    <div
                        key={contributor.user._id}
                        className={`flex items-center justify-between p-3 rounded-lg ${index < 3
                                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                                : 'bg-gray-50 dark:bg-gray-700/50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 flex justify-center">
                                {getMedalIcon(index)}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {contributor.user.name}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {contributor.totalPayments} ครั้ง • {contributor.onTimeRate.toFixed(0)}% ตรงเวลา
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                ฿{contributor.totalAmount.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopContributors;
