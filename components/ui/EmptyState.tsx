import React from 'react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {icon && <div className="text-6xl mb-4 opacity-50">{icon}</div>}
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
            {description && <p className="text-gray-500 mb-6 max-w-md">{description}</p>}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
