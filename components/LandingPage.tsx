import React, { useState } from 'react';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium'>('pro');

    const features = [
        {
            icon: 'auto_awesome',
            title: 'AI Estilista Personal',
            description: 'Inteligencia artificial que crea outfits perfectos basados en tu guardarropa',
            gradient: 'from-purple-500 to-pink-600',
        },
        {
            icon: 'photo_camera',
            title: 'Armario Digital',
            description: 'Digitaliza todas tus prendas con un simple foto. Organización inteligente',
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            icon: 'groups',
            title: 'Red Social de Moda',
            description: 'Comparte outfits, pide prestado a amigos, inspírate con la comunidad',
            gradient: 'from-orange-500 to-red-500',
        },
        {
            icon: 'analytics',
            title: 'Smart Analytics',
            description: 'Analiza tu estilo, identifica gaps, optimiza tu guardarropa',
            gradient: 'from-green-500 to-emerald-600',
        },
        {
            icon: 'event',
            title: 'Calendario de Outfits',
            description: 'Planifica tu semana, nunca más "no tengo nada que ponerme"',
            gradient: 'from-indigo-500 to-purple-600',
        },
        {
            icon: 'share',
            title: 'Export a Redes',
            description: 'Comparte tus looks directamente a Instagram y TikTok',
            gradient: 'from-pink-500 to-rose-600',
        },
    ];

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: '$0',
            period: 'siempre',
            description: 'Para empezar',
            features: [
                '5 prendas en tu armario',
                '5 generaciones IA/mes',
                'Funciones básicas',
                'Comunidad limitada',
            ],
            cta: 'Empezar Gratis',
            popular: false,
            gradient: 'from-gray-500 to-gray-600',
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '$7',
            period: '/mes',
            description: 'Lo más popular',
            features: [
                'Prendas ilimitadas',
                '50 generaciones IA/mes',
                'Analytics avanzados',
                'Virtual Try-On',
                'Sin anuncios',
                'Comunidad completa',
            ],
            cta: '7 Días Gratis',
            popular: true,
            gradient: 'from-primary to-purple-600',
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '$15',
            period: '/mes',
            description: 'Para fashion lovers',
            features: [
                'Todo de Pro +',
                'Generaciones ilimitadas',
                'AI Personal Stylist',
                'Export a redes sociales',
                'Outfit Calendar',
                'Soporte prioritario',
                'Acceso anticipado a features',
            ],
            cta: '7 Días Gratis',
            popular: false,
            gradient: 'from-yellow-500 to-orange-600',
        },
    ];

    const testimonials = [
        {
            name: 'María González',
            username: '@mariaG',
            avatar: 'https://i.pravatar.cc/150?img=1',
            text: 'Esta app cambió mi vida. Ya no pierdo tiempo eligiendo qué ponerme. ¡El AI es increíble!',
            rating: 5,
        },
        {
            name: 'Lucas Martínez',
            username: '@lucasm',
            avatar: 'https://i.pravatar.cc/150?img=3',
            text: 'Genial para descubrir combinaciones que nunca se me hubieran ocurrido. Vale cada centavo.',
            rating: 5,
        },
        {
            name: 'Ana Rodríguez',
            username: '@anarodri',
            avatar: 'https://i.pravatar.cc/150?img=5',
            text: 'La función de pedir prestado a amigas es lo mejor. Mi guardarropa se multiplicó x10.',
            rating: 5,
        },
    ];

    const stats = [
        { value: '10K+', label: 'Usuarios Activos' },
        { value: '50K+', label: 'Outfits Creados' },
        { value: '4.9★', label: 'Rating' },
        { value: '95%', label: 'Satisfacción' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-white text-xl">checkroom</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    StyleAI
                                </h1>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Tu estilista personal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onLogin}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                            >
                                Iniciar Sesión
                            </button>
                            <button
                                onClick={onGetStarted}
                                className="px-6 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                            >
                                Empezar Gratis
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-32 px-4">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5"></div>
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

                <div className="relative max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-sm font-semibold text-primary">Nuevo: AI Virtual Try-On 🔥</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                            Nunca más
                            <span className="block bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                                "No tengo nada para ponerme"
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Tu estilista personal con <span className="font-bold text-primary">Inteligencia Artificial</span>.
                            Crea outfits perfectos en segundos, digitaliza tu guardarropa, y comparte con tu comunidad.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={onGetStarted}
                                className="px-8 py-4 bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white rounded-2xl text-lg font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <span className="relative flex items-center gap-2">
                                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                                    Empezar Gratis
                                </span>
                            </button>
                            <button className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95 border-2 border-gray-200 dark:border-gray-700">
                                Ver Demo
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                            ✨ 7 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 transition-transform">
                                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-4 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Todo lo que necesitás
                            <span className="block bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                en una sola app
                            </span>
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Potenciado por inteligencia artificial de última generación
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="group relative p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>

                                <div className="relative">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                                        {feature.title}
                                    </h3>

                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Elegí tu plan
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Todos los planes incluyen 7 días gratis
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-3xl p-8 transition-all duration-300 ${plan.popular
                                        ? 'bg-gradient-to-br from-primary to-purple-600 shadow-2xl shadow-primary/30 scale-105 border-2 border-primary'
                                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-xl'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-bold shadow-lg">
                                        ⭐ Más Popular
                                    </div>
                                )}

                                <div className={plan.popular ? 'text-white' : ''}>
                                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                    <p className={`text-sm mb-6 ${plan.popular ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {plan.description}
                                    </p>

                                    <div className="mb-8">
                                        <span className="text-5xl font-bold">{plan.price}</span>
                                        <span className={`text-lg ${plan.popular ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {plan.period}
                                        </span>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className={`material-symbols-outlined text-lg ${plan.popular ? 'text-white' : 'text-primary'}`}>
                                                    check_circle
                                                </span>
                                                <span className={`text-sm ${plan.popular ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={onGetStarted}
                                        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${plan.popular
                                                ? 'bg-white text-primary hover:bg-gray-50 shadow-xl'
                                                : 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:scale-105'
                                            }`}
                                    >
                                        {plan.cta}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-4 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Lo que dicen nuestros usuarios
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, i) => (
                            <div
                                key={i}
                                className="p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <img
                                        src={testimonial.avatar}
                                        alt={testimonial.name}
                                        className="w-14 h-14 rounded-full border-2 border-primary"
                                    />
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{testimonial.name}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.username}</p>
                                    </div>
                                </div>

                                <div className="flex gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <span key={i} className="text-yellow-400">★</span>
                                    ))}
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                                    "{testimonial.text}"
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20 px-4 bg-gradient-to-br from-primary via-purple-600 to-pink-600 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                        ¿Listo para transformar tu estilo?
                    </h2>
                    <p className="text-xl md:text-2xl mb-12 text-white/90">
                        Únete a miles de usuarios que ya revolucionaron su guardarropa
                    </p>

                    <button
                        onClick={onGetStarted}
                        className="px-12 py-5 bg-white text-primary rounded-2xl text-xl font-bold shadow-2xl hover:shadow-white/30 hover:scale-105 transition-all active:scale-95"
                    >
                        Empezar Ahora - Es Gratis
                    </button>

                    <p className="text-sm mt-6 text-white/80">
                        Sin tarjeta de crédito · 7 días gratis · Cancela cuando quieras
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4">StyleAI</h3>
                            <p className="text-sm text-gray-400">
                                Tu estilista personal con IA
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Producto</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Compañía</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Sobre Nosotros</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
                                <li><a href="#" className="hover:text-primary transition-colors">Términos</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-gray-400">
                            © 2024 StyleAI. Todos los derechos reservados.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors">
                                <span className="text-sm">IG</span>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors">
                                <span className="text-sm">TT</span>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-primary flex items-center justify-center transition-colors">
                                <span className="text-sm">X</span>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
