import React, { useState, useMemo } from 'react';
import { faqs, featureHelp, keyboardShortcuts, type FAQ, type HelpItem } from '../../data/helpContent';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'faq' | 'features' | 'shortcuts' | 'contact';
  highlightFeature?: string;
}

type TabType = 'faq' | 'features' | 'shortcuts' | 'contact';

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'faq',
  highlightFeature
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(highlightFeature || null);

  // FAQ categories
  const faqCategories = [
    { id: 'all', label: 'Todas' },
    { id: 'getting-started', label: 'Primeros pasos' },
    { id: 'ai-features', label: 'Funciones IA' },
    { id: 'closet', label: 'Armario' },
    { id: 'social', label: 'Social' },
    { id: 'privacy', label: 'Privacidad' },
    { id: 'technical', label: 'Técnico' }
  ];
  const [selectedFaqCategory, setSelectedFaqCategory] = useState('all');

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    let filtered = faqs;

    if (selectedFaqCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedFaqCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        f => f.question.toLowerCase().includes(query) ||
             f.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [selectedFaqCategory, searchQuery]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    const features = Object.values(featureHelp);
    if (!searchQuery) return features;

    const query = searchQuery.toLowerCase();
    return features.filter(
      f => f.title.toLowerCase().includes(query) ||
           f.shortHelp.toLowerCase().includes(query) ||
           f.keywords.some(k => k.includes(query))
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'faq', label: 'Preguntas', icon: 'help' },
    { id: 'features', label: 'Funciones', icon: 'apps' },
    { id: 'shortcuts', label: 'Atajos', icon: 'keyboard' },
    { id: 'contact', label: 'Contacto', icon: 'mail' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">help</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary dark:text-gray-100">
                  Centro de Ayuda
                </h2>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Todo lo que necesitás saber
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Cerrar ayuda"
            >
              <span className="material-symbols-outlined text-text-secondary">close</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar en la ayuda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-text-primary dark:text-gray-100 placeholder-text-secondary focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* Category filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {faqCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedFaqCategory(cat.id)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${selectedFaqCategory === cat.id
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-gray-100 dark:bg-slate-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-slate-700'
                      }
                    `}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* FAQ List */}
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-text-secondary mb-2">search_off</span>
                  <p className="text-text-secondary">No encontramos resultados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFaqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === `${index}` ? null : `${index}`)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="font-medium text-text-primary dark:text-gray-100 pr-4">
                          {faq.question}
                        </span>
                        <span className={`material-symbols-outlined text-text-secondary transition-transform ${expandedFaq === `${index}` ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>
                      {expandedFaq === `${index}` && (
                        <div className="px-4 pb-4 text-text-secondary dark:text-gray-400 animate-fade-in">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              {selectedFeature ? (
                // Feature detail view
                <div className="animate-fade-in">
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="flex items-center gap-2 text-primary mb-4 hover:underline"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Volver a todas las funciones
                  </button>

                  {featureHelp[selectedFeature] && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-bold text-text-primary dark:text-gray-100 mb-2">
                          {featureHelp[selectedFeature].title}
                        </h3>
                        <p className="text-text-secondary dark:text-gray-400">
                          {featureHelp[selectedFeature].fullHelp}
                        </p>
                      </div>

                      {featureHelp[selectedFeature].steps && (
                        <div>
                          <h4 className="font-bold text-text-primary dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">format_list_numbered</span>
                            Cómo usar
                          </h4>
                          <ol className="space-y-2">
                            {featureHelp[selectedFeature].steps!.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-text-secondary dark:text-gray-400">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {featureHelp[selectedFeature].tips && (
                        <div>
                          <h4 className="font-bold text-text-primary dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary">lightbulb</span>
                            Tips Pro
                          </h4>
                          <ul className="space-y-2">
                            {featureHelp[selectedFeature].tips!.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-text-secondary dark:text-gray-400">
                                <span className="text-secondary">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {featureHelp[selectedFeature].relatedFeatures && (
                        <div>
                          <h4 className="font-bold text-text-primary dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent">link</span>
                            Funciones relacionadas
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {featureHelp[selectedFeature].relatedFeatures!.map((relatedId) => (
                              featureHelp[relatedId] && (
                                <button
                                  key={relatedId}
                                  onClick={() => setSelectedFeature(relatedId)}
                                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-text-secondary text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  {featureHelp[relatedId].title}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Features list
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFeatures.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => setSelectedFeature(feature.id)}
                      className="p-4 text-left border border-gray-200 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                      <h4 className="font-bold text-text-primary dark:text-gray-100 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2 mt-1">
                        {feature.shortHelp}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shortcuts Tab */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <p className="text-text-secondary dark:text-gray-400 mb-4">
                Usá estos atajos de teclado para navegar más rápido (solo en desktop).
              </p>
              <div className="space-y-2">
                {keyboardShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl"
                  >
                    <div>
                      <span className="font-medium text-text-primary dark:text-gray-100">
                        {shortcut.action}
                      </span>
                      <p className="text-sm text-text-secondary dark:text-gray-400">
                        {shortcut.description}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-text-secondary mx-1">o</span>}
                          <kbd className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded text-sm font-mono text-text-primary dark:text-gray-100 shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">support_agent</span>
                </div>
                <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 mb-2">
                  ¿Necesitás más ayuda?
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  Estamos acá para ayudarte
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="mailto:soporte@ojodeloca.app"
                  className="flex items-center gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600">mail</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary dark:text-gray-100">Email</h4>
                    <p className="text-sm text-text-secondary dark:text-gray-400">soporte@ojodeloca.app</p>
                  </div>
                </a>

                <a
                  href="https://instagram.com/ojodeloca.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-pink-600">photo_camera</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary dark:text-gray-100">Instagram</h4>
                    <p className="text-sm text-text-secondary dark:text-gray-400">@ojodeloca.app</p>
                  </div>
                </a>

                <a
                  href="https://twitter.com/ojodeloca_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sky-600">alternate_email</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary dark:text-gray-100">Twitter / X</h4>
                    <p className="text-sm text-text-secondary dark:text-gray-400">@ojodeloca_app</p>
                  </div>
                </a>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">info</span>
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-200">Tiempo de respuesta</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Respondemos emails en 24-48 horas hábiles. Para consultas urgentes, usá Instagram DM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <p className="text-xs text-center text-text-secondary dark:text-gray-400">
            v1.0.0 • Hecho con amor en Argentina
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
