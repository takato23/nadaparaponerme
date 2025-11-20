import React, { useState } from 'react';
import { LiquidMorphBackground } from './LiquidMorphBackground';

/**
 * Demo page to showcase LiquidMorphBackground variations
 */
export const LiquidMorphDemo: React.FC = () => {
    const [config, setConfig] = useState({
        intensity: 5,
        blobCount: 4,
        speed: 1,
        colorScheme: 'primary' as 'primary' | 'accent' | 'gradient' | 'purple',
        opacity: 0.15,
        blur: true,
    });

    const presets = [
        {
            name: '🌊 Ocean Calm',
            config: { intensity: 4, blobCount: 3, speed: 0.7, colorScheme: 'primary' as const, opacity: 0.12, blur: true },
        },
        {
            name: '💖 Pink Dream',
            config: { intensity: 6, blobCount: 5, speed: 1.2, colorScheme: 'accent' as const, opacity: 0.18, blur: true },
        },
        {
            name: '🌈 Gradient Flow',
            config: { intensity: 7, blobCount: 6, speed: 1, colorScheme: 'gradient' as const, opacity: 0.2, blur: true },
        },
        {
            name: '🔮 Purple Haze',
            config: { intensity: 5, blobCount: 4, speed: 0.8, colorScheme: 'purple' as const, opacity: 0.15, blur: true },
        },
        {
            name: '⚡ High Energy',
            config: { intensity: 8, blobCount: 7, speed: 1.5, colorScheme: 'gradient' as const, opacity: 0.25, blur: false },
        },
        {
            name: '🧘 Minimal Zen',
            config: { intensity: 3, blobCount: 2, speed: 0.5, colorScheme: 'primary' as const, opacity: 0.1, blur: true },
        },
    ];

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-background-light to-slate-100 dark:from-background-dark dark:to-slate-900 overflow-hidden">
            {/* Liquid Morph Background */}
            <LiquidMorphBackground {...config} />

            {/* Demo Content */}
            <div className="relative z-10 min-h-screen p-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-4 text-gradient">
                        Liquid Morph Background
                    </h1>
                    <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                        Formas líquidas animadas con glassmorphism. Perfecto para tu estética "Liquid Glass" 🌊✨
                    </p>
                </div>

                {/* Preset Buttons */}
                <div className="max-w-4xl mx-auto mb-12">
                    <h2 className="text-2xl font-semibold mb-4 text-center">⚡ Presets</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {presets.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => setConfig(preset.config)}
                                className="glass-card p-4 text-center hover:scale-105 transition-transform active:scale-95"
                            >
                                <span className="text-lg">{preset.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Controls */}
                <div className="max-w-4xl mx-auto glass-card p-8">
                    <h2 className="text-2xl font-semibold mb-6">🎛️ Controles Personalizados</h2>

                    <div className="space-y-6">
                        {/* Intensity */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Intensity: {config.intensity}
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={config.intensity}
                                onChange={(e) => setConfig({ ...config, intensity: Number(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Blob Count */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Blob Count: {config.blobCount}
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="8"
                                value={config.blobCount}
                                onChange={(e) => setConfig({ ...config, blobCount: Number(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Speed */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Speed: {config.speed.toFixed(1)}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={config.speed}
                                onChange={(e) => setConfig({ ...config, speed: Number(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Opacity */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Opacity: {(config.opacity * 100).toFixed(0)}%
                            </label>
                            <input
                                type="range"
                                min="0.05"
                                max="0.4"
                                step="0.01"
                                value={config.opacity}
                                onChange={(e) => setConfig({ ...config, opacity: Number(e.target.value) })}
                                className="w-full"
                            />
                        </div>

                        {/* Color Scheme */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Color Scheme
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['primary', 'accent', 'gradient', 'purple'] as const).map((scheme) => (
                                    <button
                                        key={scheme}
                                        onClick={() => setConfig({ ...config, colorScheme: scheme })}
                                        className={`p-3 rounded-xl border-2 transition-all ${config.colorScheme === scheme
                                                ? 'border-primary bg-primary/10'
                                                : 'border-transparent bg-white/5'
                                            }`}
                                    >
                                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Blur Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Apply Blur</label>
                            <button
                                onClick={() => setConfig({ ...config, blur: !config.blur })}
                                className={`px-6 py-2 rounded-full transition-all ${config.blur
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 text-text-secondary'
                                    }`}
                            >
                                {config.blur ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Example Card */}
                <div className="max-w-4xl mx-auto mt-8 glass-card p-8">
                    <h3 className="text-2xl font-semibold mb-4">📦 Example Content</h3>
                    <p className="text-text-secondary mb-4">
                        Este fondo funciona perfecto con cualquier contenido glassmorphic.
                        Probá cambiando los presets para ver diferentes vibes.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="glass-card p-6 text-center">
                            <div className="text-3xl mb-2">👕</div>
                            <div className="font-semibold">Fashion</div>
                        </div>
                        <div className="glass-card p-6 text-center">
                            <div className="text-3xl mb-2">✨</div>
                            <div className="font-semibold">Premium</div>
                        </div>
                        <div className="glass-card p-6 text-center">
                            <div className="text-3xl mb-2">🎨</div>
                            <div className="font-semibold">Elegant</div>
                        </div>
                    </div>
                </div>

                {/* Usage Example */}
                <div className="max-w-4xl mx-auto mt-8 glass-card p-8">
                    <h3 className="text-2xl font-semibold mb-4">💻 Uso en tu App</h3>
                    <pre className="bg-black/20 p-4 rounded-xl overflow-x-auto text-sm">
                        {`// En HomeView.tsx o cualquier view
import { LiquidMorphBackground } from './LiquidMorphBackground';

export const HomeView = () => {
  return (
    <div className="relative min-h-screen">
      {/* Background animado */}
      <LiquidMorphBackground
        intensity={5}
        blobCount={4}
        speed={1}
        colorScheme="primary"
        opacity={0.15}
        blur={true}
        zIndex={-1}
      />
      
      {/* Tu contenido aquí */}
      <div className="relative z-10">
        {/* ... */}
      </div>
    </div>
  );
};`}
                    </pre>
                </div>

                {/* Recommendations */}
                <div className="max-w-4xl mx-auto mt-8 glass-card p-8">
                    <h3 className="text-2xl font-semibold mb-4">💡 Recomendaciones</h3>
                    <ul className="space-y-3 text-text-secondary">
                        <li>✅ <strong>HomeView</strong>: Usá "Ocean Calm" o "Minimal Zen" para algo sutil</li>
                        <li>✅ <strong>Workspace</strong>: "Gradient Flow" queda premium y creativo</li>
                        <li>✅ <strong>Paywall/Landing</strong>: "Pink Dream" o "High Energy" para conversión</li>
                        <li>✅ <strong>Settings/Profile</strong>: "Purple Haze" para un toque único</li>
                        <li>⚠️ No uses en vistas con mucho contenido denso (Closet Grid)</li>
                        <li>⚠️ Mantené opacity entre 0.1-0.2 para no competir con el contenido</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LiquidMorphDemo;
