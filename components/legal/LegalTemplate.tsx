import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalTemplateProps {
  title: string;
  updatedAt: string;
  intro?: string[];
  sections: LegalSection[];
}

export const LegalTemplate: React.FC<LegalTemplateProps> = ({
  title,
  updatedAt,
  intro = [],
  sections,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#1f1d1a]">
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6d655c] hover:text-[#1f1d1a] transition"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Volver
        </button>

        <header className="mt-6 mb-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#8a8278]">Legal</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-serif font-semibold text-[#1f1d1a]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[#6d655c]">Última actualización: {updatedAt}</p>
          {intro.length > 0 && (
            <div className="mt-4 space-y-2 text-sm text-[#4d463f]">
              {intro.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          )}
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl bg-white/80 border border-white/70 shadow-sm p-5 md:p-6">
              <h2 className="text-lg font-semibold text-[#1f1d1a]">{section.title}</h2>
              {section.paragraphs && (
                <div className="mt-3 space-y-2 text-sm text-[#4d463f]">
                  {section.paragraphs.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <ul className="mt-3 space-y-2 text-sm text-[#4d463f]">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-[#c58b6a] mt-0.5">fiber_manual_record</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalTemplate;
