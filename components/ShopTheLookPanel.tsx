import React, { useEffect, useMemo, useState } from 'react';
import type { ClothingItem, ItemShoppingState } from '../types';
import { searchProductsForItem } from '../src/services/aiService';
import {
  buildLookSearchTerm,
  buildSearchTermFromItem,
  getShoppingLinks,
  getSponsoredPlacements,
  MONETIZATION_FLAGS,
  getFeatureFlag,
} from '../src/services/monetizationService';
import Loader from './Loader';
import { Card, type CardProps } from './ui/Card';

type ShopSlot = 'top' | 'bottom' | 'shoes' | string;

interface ShopTheLookItem {
  slot: ShopSlot;
  item: ClothingItem;
  label?: string;
}

interface ShopTheLookPanelProps {
  items: ShopTheLookItem[];
  borrowedItemIds?: Set<string>;
  onOpenFinder?: () => void;
  showItems?: boolean;
  title?: string;
  variant?: CardProps['variant'];
  className?: string;
}

const SLOT_LABELS: Record<string, string> = {
  top: 'Parte superior',
  bottom: 'Parte inferior',
  shoes: 'Calzado',
};

const ShopTheLookPanel = ({
  items,
  borrowedItemIds,
  onOpenFinder,
  showItems = true,
  title = 'Shop the Look',
  variant = 'glass',
  className = '',
}: ShopTheLookPanelProps) => {
  const itemEntries = useMemo(() => items.filter(Boolean), [items]);
  const lookSearchTerm = useMemo(
    () => buildLookSearchTerm(itemEntries.map((entry) => entry.item)),
    [itemEntries]
  );

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemShopping, setItemShopping] = useState<Record<string, ItemShoppingState>>({});

  useEffect(() => {
    const initialState: Record<string, ItemShoppingState> = {};
    itemEntries.forEach((entry) => {
      initialState[entry.item.id] = { isLoading: false, links: [] };
    });
    setItemShopping(initialState);
    setExpandedItemId(null);
  }, [itemEntries]);

  if (itemEntries.length === 0) return null;

  const affiliatesEnabled = getFeatureFlag(MONETIZATION_FLAGS.ENABLE_AFFILIATES);
  const sponsoredEnabled = getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SPONSORED_PLACEMENTS);
  const lookPlacements = sponsoredEnabled ? getSponsoredPlacements(lookSearchTerm) : [];
  const lookLinks = affiliatesEnabled ? getShoppingLinks(lookSearchTerm) : [];

  const handleToggleItem = (entry: ShopTheLookItem) => {
    const isClosing = expandedItemId === entry.item.id;
    setExpandedItemId(isClosing ? null : entry.item.id);
    if (!isClosing) {
      void ensureItemSearch(entry);
    }
  };

  const ensureItemSearch = async (entry: ShopTheLookItem) => {
    const current = itemShopping[entry.item.id];
    if (current?.isLoading || (current?.links.length ?? 0) > 0) return;

    const searchTerm = buildSearchTermFromItem(entry.item);
    setItemShopping((prev) => ({
      ...prev,
      [entry.item.id]: {
        ...(prev[entry.item.id] ?? { links: [] }),
        isLoading: true,
        error: undefined,
      },
    }));

    try {
      const links = await searchProductsForItem(searchTerm, entry.item.metadata.category);
      setItemShopping((prev) => ({
        ...prev,
        [entry.item.id]: { isLoading: false, links },
      }));
    } catch (error) {
      setItemShopping((prev) => ({
        ...prev,
        [entry.item.id]: { isLoading: false, links: [], error: 'Error al buscar' },
      }));
    }
  };

  return (
    <Card variant={variant} padding="md" rounded="2xl" className={`space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary dark:text-white">{title}</h3>
          <p className="text-xs text-text-secondary dark:text-gray-400">
            Compra el look completo o por prenda.
          </p>
        </div>
        {onOpenFinder && (
          <button
            onClick={onOpenFinder}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/60 dark:bg-white/10 border border-white/30 hover:bg-white/80 dark:hover:bg-white/20 transition-all"
          >
            Identificar prenda
          </button>
        )}
      </div>

      {(lookPlacements.length > 0 || lookLinks.length > 0) && (
        <div className="space-y-3">
          {lookPlacements.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                Patrocinado
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lookPlacements.map((placement) => (
                  <a
                    key={placement.id}
                    href={placement.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-white/20 hover:border-emerald-400/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500 text-lg">
                        {placement.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-primary dark:text-white">
                          {placement.name}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {placement.description}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 mt-2">
                      {placement.cta}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {lookLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                Buscar el look completo
              </p>
              <div className="grid grid-cols-3 gap-2">
                {lookLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/60 dark:bg-white/10 border border-white/20 hover:border-emerald-400/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-all text-center"
                  >
                    <span className="material-symbols-outlined text-lg block mb-1">{link.icon}</span>
                    <span className="text-xs font-semibold">{link.name}</span>
                    <span className="block text-xs text-emerald-600 font-bold uppercase">Afiliado</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showItems && (
        <div className="space-y-2">
          {itemEntries.map((entry) => {
            const shopping = itemShopping[entry.item.id];
            const isExpanded = expandedItemId === entry.item.id;
            const searchTerm = buildSearchTermFromItem(entry.item);
            const quickLinks = affiliatesEnabled ? getShoppingLinks(searchTerm) : [];
            const placements = sponsoredEnabled
              ? getSponsoredPlacements(searchTerm, entry.item)
              : [];

            return (
              <div
                key={entry.item.id}
                className="rounded-xl border border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/5 overflow-hidden"
              >
                <button
                  onClick={() => handleToggleItem(entry)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={entry.item.imageDataUrl}
                        alt={entry.item.metadata.subcategory}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      {borrowedItemIds?.has(entry.item.id) && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                          Prestado
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                        {entry.label || SLOT_LABELS[entry.slot] || 'Prenda'}
                      </p>
                      <p className="text-sm font-semibold text-text-primary dark:text-white">
                        {entry.item.metadata.subcategory}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {entry.item.metadata.color_primary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <span className="material-symbols-outlined text-lg">shopping_bag</span>
                    <span className="text-xs font-bold">{isExpanded ? 'Ocultar' : 'Ver tiendas'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/30 dark:border-white/10 px-3 py-3 space-y-3 animate-fade-in">
                    {placements.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                          Patrocinado
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {placements.map((placement) => (
                            <a
                              key={placement.id}
                              href={placement.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-white/20 hover:border-emerald-400/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 text-lg">
                                  {placement.icon}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                                    {placement.name}
                                  </p>
                                  <p className="text-xs text-text-secondary dark:text-gray-400">
                                    {placement.description}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-emerald-600 mt-2">
                                {placement.cta}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {quickLinks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                          Links afiliados
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {quickLinks.map((link) => (
                            <a
                              key={link.platform}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-white/60 dark:bg-white/10 border border-white/20 hover:border-emerald-400/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-all text-center"
                            >
                              <span className="material-symbols-outlined text-lg block mb-1">
                                {link.icon}
                              </span>
                              <span className="text-xs font-semibold">{link.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                        Resultados AI
                      </p>

                      {shopping?.isLoading && (
                        <div className="flex items-center justify-center py-3">
                          <Loader />
                        </div>
                      )}

                      {shopping?.error && (
                        <p className="text-xs text-red-500 text-center">{shopping.error}</p>
                      )}

                      {!shopping?.isLoading && shopping?.links.length === 0 && !shopping?.error && (
                        <p className="text-xs text-text-secondary dark:text-gray-400 text-center">
                          Usar links directos para buscar esta prenda.
                        </p>
                      )}

                      {!shopping?.isLoading && shopping?.links.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {shopping.links.slice(0, 5).map((link, index) => {
                            const hostname = (() => {
                              try {
                                return new URL(link.web.uri).hostname;
                              } catch {
                                return link.web.uri;
                              }
                            })();

                            return (
                              <a
                                key={index}
                                href={link.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white/60 dark:bg-white/10 p-2 rounded-lg text-xs hover:bg-white/80 dark:hover:bg-white/20 transition-all"
                              >
                                <p className="font-semibold text-text-primary dark:text-white truncate">
                                  {link.web.title}
                                </p>
                                <p className="text-text-secondary dark:text-gray-400 truncate">{hostname}</p>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ShopTheLookPanel;
