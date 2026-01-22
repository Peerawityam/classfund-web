import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionStatus, TransactionType } from '../../types';

interface ExpenseBreakdownProps {
    transactions: Transaction[];
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ transactions }) => {
    const expenseData = useMemo(() => {
        const expenses = transactions.filter(
            t => t.status === TransactionStatus.APPROVED && t.type === TransactionType.EXPENSE
        );

        // Group by note/category
        const categories: { [key: string]: number } = {};

        expenses.forEach(t => {
            const category = t.note || 'อื่นๆ';
            categories[category] = (categories[category] || 0) + t.amount;
        });

        // Convert to array and sort by amount
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories
    }, [transactions]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (expenseData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">การใช้จ่ายตามหมวดหมู่</h3>
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    ยังไม่มีข้อมูลรายจ่าย
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">การใช้จ่ายตามหมวดหมู่ (Top 5)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {expenseData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '8px'
                        }}
                        formatter={(value: number | undefined) => value ? `฿${value.toLocaleString()}` : '฿0'}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ExpenseBreakdown;
