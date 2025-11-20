import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { MONETIZATION_FLAGS, getFeatureFlag, setFeatureFlag } from '../src/services/monetizationService';

interface MonetizationSettingsModalProps {
    onClose: () => void;
}

const MonetizationSettingsModal: React.FC<MonetizationSettingsModalProps> = ({ onClose }) => {
    const [flags, setFlags] = useState({
        shareReward: false,
        watermark: false,
        affiliates: false,
    });

    useEffect(() => {
        setFlags({
            shareReward: getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SHARE_REWARD),
            watermark: getFeatureFlag(MONETIZATION_FLAGS.ENABLE_WATERMARK),
            affiliates: getFeatureFlag(MONETIZATION_FLAGS.ENABLE_AFFILIATES),
        });
    }, []);

    const handleToggle = (key: string, stateKey: keyof typeof flags) => {
        const newValue = !flags[stateKey];
        setFeatureFlag(key, newValue);
        setFlags(prev => ({ ...prev, [stateKey]: newValue }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500">monetization_on</span>
                        Configuración de Monetización
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            Estas configuraciones afectan a todos los usuarios inmediatamente. Úsalas con precaución.
                        </p>
                    </div>

                    {/* Share to Unlock */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                <span className="material-symbols-outlined">share</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Share to Unlock</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Recompensa por compartir en redes</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={flags.shareReward}
                                onChange={() => handleToggle(MONETIZATION_FLAGS.ENABLE_SHARE_REWARD, 'shareReward')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    {/* Watermark */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined">branding_watermark</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Watermark Marketing</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Marca de agua para usuarios Free</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={flags.watermark}
                                onChange={() => handleToggle(MONETIZATION_FLAGS.ENABLE_WATERMARK, 'watermark')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Affiliates */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined">shopping_bag</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Shop the Look</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Enlaces de afiliados en productos</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={flags.affiliates}
                                onChange={() => handleToggle(MONETIZATION_FLAGS.ENABLE_AFFILIATES, 'affiliates')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MonetizationSettingsModal;
