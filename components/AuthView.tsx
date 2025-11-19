
import React, { useState } from 'react';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import { signIn, signUp } from '../src/services/authService';

interface AuthViewProps {
  onLogin: () => void;
}

const AuthView = ({ onLogin }: AuthViewProps) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setLoading(true);

      if (isLoginView) {
        await signIn(email, password);
        onLogin();
      } else {
        const fallbackName = name || username || email.split('@')[0];
        await signUp(email, password, fallbackName, username || undefined);
        setSuccessMessage('Revisa tu email para confirmar tu cuenta.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      const message = err instanceof Error ? err.message : 'Error al autenticarse. Intentá nuevamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full max-w-md flex flex-col justify-center items-center p-8 liquid-glass rounded-4xl animate-fade-in">
        <div className="w-24 h-24 mb-6">
            <OjoDeLocaLogo className="w-full h-full text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary dark:text-gray-100 mb-2">
            {isLoginView ? '¡Hola de nuevo!' : 'Crea tu cuenta'}
        </h1>
        <p className="text-text-secondary dark:text-gray-400 mb-8">
            {isLoginView ? 'Inicia sesión para acceder a tu armario.' : 'Únete para empezar a digitalizar tu estilo.'}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
            {!isLoginView && (
                <>
                    <input
                        type="text"
                        placeholder="Nombre completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                        type="text"
                        placeholder="Usuario (opcional)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
                    />
                </>
            )}
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
            />
            <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
            />

            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
                    <p className="text-emerald-900 dark:text-emerald-200 text-sm">{successMessage}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Cargando...' : (isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
        </form>

        <div className="mt-6">
            <button
                onClick={() => {
                    setIsLoginView(!isLoginView);
                    setError(null);
                    setSuccessMessage(null);
                }}
                className="text-sm font-medium text-primary"
            >
                {isLoginView ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
        </div>
    </div>
  );
};

export default AuthView;
