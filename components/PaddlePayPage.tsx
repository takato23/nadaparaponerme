import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ROUTES } from '../src/routes';

declare global {
  interface Window {
    // Paddle.js attaches itself to window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle?: any;
  }
}

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let paddleScriptPromise: Promise<void> | null = null;

function loadPaddleScript(): Promise<void> {
  if (paddleScriptPromise) return paddleScriptPromise;

  paddleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paddle-v2="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Paddle.js')), { once: true });
      // If it's already loaded, resolve immediately.
      if (window.Paddle) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.dataset.paddleV2 = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Paddle.js'));
    document.head.appendChild(script);
  });

  return paddleScriptPromise;
}

export default function PaddlePayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ptxn = query.get('_ptxn') || query.get('ptxn');
  const tier = query.get('tier');

  useEffect(() => {
    const token =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import.meta.env as any).VITE_PADDLE_CLIENT_TOKEN as string | undefined;

    if (!token || token.trim().length === 0) {
      setError('Paddle no está configurado (VITE_PADDLE_CLIENT_TOKEN faltante).');
      return;
    }

    (async () => {
      try {
        await loadPaddleScript();
        if (!window.Paddle) {
          throw new Error('Paddle.js no inicializó correctamente');
        }

        // This enables "default payment link" behavior on this page.
        // If the URL contains `_ptxn`, Paddle will auto-open the checkout.
        window.Paddle.Initialize({
          token,
          eventCallback: (event: any) => {
            const name = String(event?.name || '');
            if (name === 'checkout.completed') {
              toast.success('Pago completado. Activando tu plan...');
              const tierParam = tier ? `&tier=${encodeURIComponent(tier)}` : '';
              navigate(`${ROUTES.HOME}?payment=success&provider=paddle${tierParam}`, { replace: true });
              return;
            }
            if (name === 'checkout.closed') {
              toast('Checkout cerrado.');
              navigate(ROUTES.PRICING, { replace: true });
            }
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error cargando checkout';
        setError(message);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur p-6 shadow-xl">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Checkout seguro
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Estamos abriendo el checkout para finalizar tu suscripción.
        </p>

        {ptxn && (
          <p className="mt-3 text-xs text-gray-400">
            Ref: {ptxn}
          </p>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!error && (
          <div className="mt-5 flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Cargando checkout...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
