import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionStatus, TransactionType } from '../../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';

interface PaymentChartProps {
    transactions: Transaction[];
}

const PaymentChart: React.FC<PaymentChartProps> = ({ transactions }) => {
    const chartData = useMemo(() => {
        // Get last 6 months
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const monthTransactions = transactions.filter(t => {
                const txDate = new Date(t.date);
                return t.status === TransactionStatus.APPROVED &&
                    txDate >= monthStart &&
                    txDate <= monthEnd;
            });

            const income = monthTransactions
                .filter(t => t.type === TransactionType.DEPOSIT)
                .reduce((sum, t) => sum + t.amount, 0);

            const expense = monthTransactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                month: format(month, 'MMM', { locale: th }),
                รายรับ: income,
                รายจ่าย: expense,
                คงเหลือ: income - expense
            };
        });
    }, [transactions]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">สถิติรายเดือน (6 เดือนล่าสุด)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="month"
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '8px'
                        }}
                    />
                    <Legend />
                    <Bar dataKey="รายรับ" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="รายจ่าย" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PaymentChart;
