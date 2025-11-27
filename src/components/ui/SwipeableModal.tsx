import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SwipeableModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    className?: string;
    headerActions?: React.ReactNode;
    footer?: React.ReactNode;
}

export const SwipeableModal: React.FC<SwipeableModalProps> = ({
    isOpen,
    onClose,
    children,
    title,
    className = '',
    headerActions,
    footer
}) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 pointer-events-none">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            drag="y"
                            dragConstraints={{ top: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 500) {
                                    onClose();
                                }
                            }}
                            className={`
                w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] 
                bg-white dark:bg-gray-900 
                rounded-t-3xl md:rounded-3xl 
                flex flex-col 
                shadow-2xl pointer-events-auto
                ${className}
              `}
                        >
                            {/* Handle for mobile swipe */}
                            <div className="w-full flex justify-center pt-3 pb-1 md:hidden cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-4">
                                    {title}
                                </h2>
                                <div className="flex items-center gap-2">
                                    {headerActions}
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X size={24} className="text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {children}
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-3xl">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
