import React from 'react';
import cn from '../../utils/cn';

type KumbiEntryAction = {
  label: string;
  onClick: () => void;
  emphasis?: 'primary' | 'secondary';
};

interface KumbiEntryRailProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions: KumbiEntryAction[];
  badge?: string;
  usageLabel?: string;
  footnote?: string;
  className?: string;
}

export default function KumbiEntryRail({
  eyebrow = 'Kumbi',
  title,
  description,
  actions,
  badge,
  usageLabel,
  footnote,
  className,
}: KumbiEntryRailProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(223,231,236,0.72))] p-4 shadow-[0_16px_42px_rgba(20,52,59,0.08)] backdrop-blur-xl',
        className,
      )}
      aria-label={title}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2d5f64]">
              <span className="material-symbols-outlined text-sm">forum</span>
              {eyebrow}
            </span>
            {badge ? (
              <span className="rounded-full bg-[#14343b] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {badge}
              </span>
            ) : null}
            {usageLabel ? (
              <span className="rounded-full bg-[#e7eff2] px-3 py-1 text-[11px] font-semibold text-[#14343b]">
                {usageLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.04em] text-[#14343b] sm:text-[1.7rem]">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[32rem] lg:justify-end">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                'rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5',
                action.emphasis === 'primary'
                  ? 'bg-[#08111a] text-white shadow-[0_14px_30px_rgba(8,17,26,0.18)] hover:bg-[#10202b]'
                  : 'border border-black/10 bg-white/88 text-[#14343b] hover:bg-[#f6f7f8]',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {footnote ? (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-black/45">
          {footnote}
        </p>
      ) : null}
    </section>
  );
}
