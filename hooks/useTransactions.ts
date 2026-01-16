import { useState, useEffect } from 'react';
import { Transaction } from '../types';
import * as api from '../services/apiService';

interface UseTransactionsReturn {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    refreshTransactions: () => Promise<void>;
    addTransaction: (tx: Partial<Transaction>) => Promise<void>;
    updateTransactionStatus: (id: string, status: string, approver: string) => Promise<void>;
}

/**
 * Custom hook for managing transactions
 * @param userId - Optional user ID to filter transactions
 * @param isAdmin - Whether the current user is an admin
 */
export function useTransactions(userId?: string, isAdmin: boolean = false): UseTransactionsReturn {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshTransactions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allTxs = await api.getTransactions();
            const relevantTxs = isAdmin
                ? allTxs
                : allTxs.filter((tx) => tx.userId === userId);
            setTransactions(relevantTxs);
        } catch (err: any) {
            setError(err.message || 'Failed to load transactions');
            console.error('Failed to load transactions', err);
        } finally {
            setIsLoading(false);
        }
    };

    const addTransaction = async (txData: Partial<Transaction>) => {
        try {
            await api.addTransaction(txData);
            await refreshTransactions();
        } catch (err: any) {
            setError(err.message || 'Failed to add transaction');
            throw err;
        }
    };

    const updateTransactionStatus = async (id: string, status: string, approver: string) => {
        try {
            await api.updateTransaction(id, { status, approver });
            await refreshTransactions();
        } catch (err: any) {
            setError(err.message || 'Failed to update transaction');
            throw err;
        }
    };

    useEffect(() => {
        refreshTransactions();
    }, [userId, isAdmin]);

    return {
        transactions,
        isLoading,
        error,
        refreshTransactions,
        addTransaction,
        updateTransactionStatus,
    };
}
