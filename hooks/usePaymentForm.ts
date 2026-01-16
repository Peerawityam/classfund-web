import { useState } from 'react';

interface UsePaymentFormReturn {
    amount: string;
    setAmount: (value: string) => void;
    period: string;
    setPeriod: (value: string) => void;
    note: string;
    setNote: (value: string) => void;
    slipImage: string | null;
    setSlipImage: (value: string | null) => void;
    slipHash: string;
    setSlipHash: (value: string) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
    resetForm: () => void;
    toggleTag: (tag: string) => void;
}

/**
 * Custom hook for managing payment form state
 */
export function usePaymentForm(): UsePaymentFormReturn {
    const [amount, setAmount] = useState<string>('');
    const [period, setPeriod] = useState<string>('');
    const [note, setNote] = useState('');
    const [slipImage, setSlipImage] = useState<string | null>(null);
    const [slipHash, setSlipHash] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setAmount('');
        setPeriod('');
        setNote('');
        setSlipImage(null);
        setSlipHash('');
        setSelectedTags([]);
        setIsSubmitting(false);
    };

    const toggleTag = (tag: string) => {
        const isSelected = selectedTags.includes(tag);
        let newTags: string[];

        if (isSelected) {
            newTags = selectedTags.filter((t) => t !== tag);
        } else {
            newTags = [...selectedTags, tag];
        }

        setSelectedTags(newTags);
        setNote(newTags.join(', '));
    };

    return {
        amount,
        setAmount,
        period,
        setPeriod,
        note,
        setNote,
        slipImage,
        setSlipImage,
        slipHash,
        setSlipHash,
        selectedTags,
        setSelectedTags,
        isSubmitting,
        setIsSubmitting,
        resetForm,
        toggleTag,
    };
}
