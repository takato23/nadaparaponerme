import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { ClothingItem } from '../types';
import type { UseSubscriptionReturn } from '../hooks/useSubscription';

interface HomeDashboardLiteProps {
  user: User | null;
  closet: ClothingItem[];
  onStartStudio: () => void;
  onAddItem: () => void;
  onStartChat: () => void;
  onNavigateToCloset: () => void;
  onNavigateToCommunity: () => void;
  onNavigateToSavedLooks: () => void;
  onStartActivityFeed: () => void;
  onStartBulkUpload: () => void;
  onStartVirtualShopping: () => void;
  onShowPricing?: () => void;
  onShowCredits?: () => void;
  subscription?: UseSubscriptionReturn;
}

type ActionCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
};

const cardClassName =
  'rounded-[28px] border border-black/8 bg-white/78 p-5 text-left shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white';

export default function HomeDashboardLite({
  user,
  closet,
  onStartStudio,
  onAddItem,
  onStartChat,
  onNavigateToCloset,
  onNavigateToCommunity,
  onNavigateToSavedLooks,
  onStartActivityFeed,
  onStartBulkUpload,
  onStartVirtualShopping,
  onShowPricing,
  onShowCredits,
  subscription,
}: HomeDashboardLiteProps) {
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'vos';

  const actions: ActionCard[] = [
    {
      id: 'studio',
      title: 'Studio',
      description: 'Generar looks con IA.',
      icon: 'auto_fix_high',
      onClick: onStartStudio,
    },
    {
      id: 'closet',
      title: 'Armario',
      description: 'Ver y ordenar tus prendas.',
      icon: 'checkroom',
      onClick: onNavigateToCloset,
    },
    {
      id: 'chat',
      title: 'Chat',
      description: 'Pedir ayuda al estilista.',
      icon: 'forum',
      onClick: onStartChat,
    },
    {
      id: 'saved',
      title: 'Looks guardados',
      description: 'Revisar looks y combinaciones.',
      icon: 'photo_library',
      onClick: onNavigateToSavedLooks,
    },
    {
      id: 'activity',
      title: 'Actividad',
      description: 'Ver social, comentarios y timeline.',
      icon: 'dynamic_feed',
      onClick: onStartActivityFeed,
    },
    {
      id: 'shopping',
      title: 'Compras',
      description: 'Buscar prendas y referencias.',
      icon: 'storefront',
      onClick: onStartVirtualShopping,
    },
  ];

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(141,211,255,0.38),_rgba(255,255,255,0)_38%),linear-gradient(135deg,#f7f8fc_0%,#edf2ff_45%,#f8f1ea_100%)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-black/8 bg-white/72 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Ojo de Loca</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Hola, {displayName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Esta es la entrada estable del dashboard. Desde aca podes cargar prendas, abrir Studio y volver a usar la app mientras termino de sanear la home mas compleja.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-black/8 bg-white/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prendas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{closet.length}</p>
              </div>
              <button type="button" onClick={onAddItem} className="rounded-2xl border border-black/8 bg-slate-950 px-4 py-3 text-left text-white transition hover:bg-slate-800">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Carga</p>
                <p className="mt-2 text-sm font-semibold">Agregar prenda</p>
              </button>
              <button type="button" onClick={onStartBulkUpload} className={cardClassName}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Importar</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">Carga multiple</p>
              </button>
              {subscription ? (
                <button type="button" onClick={onShowCredits} className={cardClassName}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Creditos</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {subscription.aiGenerationsLimit === -1 ? 'Ilimitados' : `${Math.max(0, subscription.aiGenerationsLimit - subscription.aiGenerationsUsed)} restantes`}
                  </p>
                </button>
              ) : (
                <div className={cardClassName}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cuenta</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">Lista</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <button key={action.id} type="button" onClick={action.onClick} className={cardClassName}>
              <span className="material-symbols-rounded text-[28px] text-slate-900">{action.icon}</span>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-black/8 bg-white/74 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Acciones rapidas</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={onNavigateToCommunity} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Comunidad
              </button>
              <button type="button" onClick={onStartActivityFeed} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Timeline
              </button>
              <button type="button" onClick={onStartStudio} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Abrir Studio
              </button>
              <button type="button" onClick={onNavigateToCloset} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Ver armario
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/8 bg-slate-950 p-5 text-white shadow-[0_22px_80px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Plan</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {subscription?.tier === 'premium' ? 'Premium' : subscription?.tier === 'pro' ? 'Pro' : 'Free'}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Si necesitás más generación o funciones pagas, abrí pricing desde acá.
            </p>
            <button
              type="button"
              onClick={onShowPricing}
              className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
            >
              Ver planes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
