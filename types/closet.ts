/**
 * CLOSET VIEW ENHANCED TYPES
 *
 * Extended types for Closet View improvements:
 * - Collections/Folders system
 * - Advanced filtering
 * - Saved views
 * - Statistics dashboard
 * - Quick actions
 * - Comparison mode
 */

import type { ClothingItem, SortOption } from '../types';

// =====================================================
// COLLECTIONS SYSTEM
// =====================================================

export interface Collection {
  id: string;                           // Unique collection ID
  name: string;                         // Collection name (e.g., "Verano 2025", "Trabajo")
  description?: string;                 // Optional description
  color: string;                        // Hex color for UI (e.g., "#FF6B6B")
  icon?: string;                        // Material icon name (e.g., "sunny", "work")
  itemIds: string[];                    // ClothingItem IDs in this collection
  createdAt: string;                    // ISO 8601 timestamp
  updatedAt: string;                    // ISO 8601 timestamp
  isDefault?: boolean;                  // System collections (e.g., "Favoritos")
  sortOrder: number;                    // Display order
}

export interface CollectionWithItems extends Collection {
  items: ClothingItem[];                // Populated items
}

// =====================================================
// ADVANCED FILTERS SYSTEM
// =====================================================

export type CategoryFilter = 'all' | 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'one-piece' | 'dress';

export interface ColorFilter {
  colors: string[];                     // Selected colors (hex or name)
  matchMode: 'exact' | 'similar';       // Exact match or similar shades
}

export interface SeasonFilter {
  seasons: string[];                    // Selected seasons
}

export interface TagFilter {
  tags: string[];                       // Selected vibe tags
  matchMode: 'any' | 'all';             // Match any tag or all tags
}

export interface VersatilityFilter {
  min: number;                          // Minimum versatility score (0-100)
  max: number;                          // Maximum versatility score (0-100)
}

export interface DateRangeFilter {
  from: string;                         // ISO 8601 date
  to: string;                           // ISO 8601 date
  preset?: 'last_week' | 'last_month' | 'last_3_months' | 'custom';
}

export interface UsageFilter {
  minTimesWorn?: number;                // Minimum times worn
  maxTimesWorn?: number;                // Maximum times worn
  lastWornWithin?: number;              // Days since last worn
}

export interface BrandFilter {
  brands: string[];                     // Selected brands
}

export interface PriceFilter {
  min?: number;                         // Minimum price
  max?: number;                         // Maximum price
  currency: string;                     // Currency (e.g., "ARS")
}

export interface AdvancedFilters {
  categories: CategoryFilter[];         // Multi-select categories
  colors?: ColorFilter;                 // Color filtering
  seasons?: SeasonFilter;               // Season filtering
  tags?: TagFilter;                     // Tag filtering
  versatility?: VersatilityFilter;      // Versatility score range
  dateAdded?: DateRangeFilter;          // Date added range
  usage?: UsageFilter;                  // Usage statistics
  brands?: BrandFilter;                 // Brand filtering
  price?: PriceFilter;                  // Price range
  isFavorite?: boolean;                 // Favorites only
  isInCollection?: string;              // Filter by collection ID
  searchText?: string;                  // Text search (subcategory, color, description)
}

export interface FilterState extends AdvancedFilters {
  isActive: boolean;                    // Are filters applied?
  activeFiltersCount: number;           // Number of active filters
}

// =====================================================
// SORTING SYSTEM (EXTENDED)
// =====================================================

export type SortProperty =
  | 'date'                              // Date added
  | 'name'                              // Name/subcategory
  | 'color'                             // Color alphabetically
  | 'versatility'                       // Versatility score
  | 'category'                          // Category
  | 'timesWorn'                         // Times worn
  | 'lastWorn'                          // Last worn date
  | 'price'                             // Price
  | 'brand';                            // Brand

export type SortDirection = 'asc' | 'desc';

export interface ExtendedSortOption {
  property: SortProperty;
  direction: SortDirection;
}

// =====================================================
// SAVED VIEWS SYSTEM
// =====================================================

export type ViewMode = 'grid' | 'list' | 'masonry' | 'carousel';

export type GridDensity = 'compact' | 'normal' | 'comfortable';

export interface VisualTheme {
  gridGap: GridDensity;                 // Grid spacing
  cardStyle: 'minimal' | 'glass' | 'bordered' | 'elevated';
  imageRatio: 'square' | 'portrait' | 'auto';
  showVersatilityScore: boolean;        // Show versatility badges
  showItemCount: boolean;               // Show item counts
}

export interface SavedView {
  id: string;                           // Unique view ID
  name: string;                         // View name (e.g., "Ropa de oficina")
  description?: string;                 // Optional description
  filters: AdvancedFilters;             // Saved filter state
  sortOption: ExtendedSortOption;       // Saved sort option
  viewMode: ViewMode;                   // Grid/list/masonry
  visualTheme?: VisualTheme;            // Visual preferences
  createdAt: string;                    // ISO 8601
  updatedAt: string;                    // ISO 8601
  isDefault?: boolean;                  // Default view
  isPinned?: boolean;                   // Pinned to quick access
}

// =====================================================
// STATISTICS DASHBOARD
// =====================================================

export interface CategoryStats {
  category: string;                     // Category name
  count: number;                        // Number of items
  percentage: number;                   // Percentage of total (0-100)
  averageVersatility?: number;          // Average versatility score
  mostWorn?: ClothingItem;              // Most worn item in category
  leastWorn?: ClothingItem;             // Least worn item in category
}

export interface ColorStats {
  color: string;                        // Color name or hex
  count: number;                        // Number of items
  percentage: number;                   // Percentage of total (0-100)
  categories: string[];                 // Categories where this color appears
}

export interface SeasonStats {
  season: string;                       // Season name
  count: number;                        // Number of items
  percentage: number;                   // Percentage of total (0-100)
  averageVersatility?: number;          // Average versatility score
}

export interface BrandStats {
  brand: string;                        // Brand name
  count: number;                        // Number of items
  totalValue?: number;                  // Total estimated value
  averagePrice?: number;                // Average price
  categories: string[];                 // Categories
}

export interface UsageStats {
  totalTimesWorn: number;               // Total wear count across all items
  averageTimesWorn: number;             // Average wear count per item
  mostWornItems: ClothingItem[];        // Top 10 most worn
  leastWornItems: ClothingItem[];       // Top 10 least worn (or never worn)
  unwornCount: number;                  // Items never worn
  unwornPercentage: number;             // Percentage never worn (0-100)
}

export interface ValueStats {
  totalValue: number;                   // Total estimated value
  averageValue: number;                 // Average value per item
  highestValueItem?: ClothingItem;      // Most expensive item
  valueByCategory: Record<string, number>; // Total value per category
  currency: string;                     // Currency (e.g., "ARS")
}

export interface ClosetStats {
  totalItems: number;                   // Total number of items
  byCategory: CategoryStats[];          // Stats per category
  byColor: ColorStats[];                // Stats per color
  bySeason: SeasonStats[];              // Stats per season
  byBrand?: BrandStats[];               // Stats per brand (if available)
  usage: UsageStats;                    // Usage statistics
  value?: ValueStats;                   // Value statistics (if available)
  averageVersatility: number;           // Average versatility score (0-100)
  mostVersatileItems: ClothingItem[];   // Top 10 most versatile
  lastUpdated: string;                  // ISO 8601
}

// =====================================================
// QUICK ACTIONS SYSTEM
// =====================================================

export type QuickActionType =
  | 'view_details'                      // Ver detalles
  | 'edit_metadata'                     // Editar metadata
  | 'create_outfit'                     // Crear outfit con esta prenda
  | 'find_similar'                      // Buscar similares
  | 'share'                             // Compartir
  | 'duplicate'                         // Duplicar
  | 'move_to_collection'                // Mover a colección
  | 'toggle_favorite'                   // Marcar/desmarcar favorito
  | 'delete'                            // Eliminar
  | 'add_to_comparison';                // Agregar a comparación

export interface QuickAction {
  type: QuickActionType;
  label: string;                        // Display label
  icon: string;                         // Material icon name
  color?: string;                       // Optional color (e.g., "red" for delete)
  requiresConfirmation?: boolean;       // Requires confirmation dialog
  isDestructive?: boolean;              // Is a destructive action
}

export interface QuickActionsConfig {
  mobile: QuickAction[];                // Actions for mobile (long press)
  desktop: QuickAction[];               // Actions for desktop (right click)
  grid: QuickAction[];                  // Actions in grid view
  list: QuickAction[];                  // Actions in list view
}

// =====================================================
// BULK ACTIONS SYSTEM
// =====================================================

export type BulkActionType =
  | 'delete'                            // Eliminar múltiples
  | 'move_to_collection'                // Mover a colección
  | 'add_tags'                          // Aplicar tags
  | 'remove_tags'                       // Quitar tags
  | 'mark_favorite'                     // Marcar favoritos
  | 'unmark_favorite'                   // Desmarcar favoritos
  | 'export';                           // Exportar

export interface BulkAction {
  type: BulkActionType;
  label: string;
  icon: string;
  requiresInput?: boolean;              // Requires additional input (e.g., collection name)
  requiresConfirmation?: boolean;
  isDestructive?: boolean;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;             // Selected item IDs
  isSelectionMode: boolean;             // Is selection mode active
  selectAll: boolean;                   // Are all items selected
}

// =====================================================
// COMPARISON MODE
// =====================================================

export interface ComparisonItem {
  item: ClothingItem;
  versatilityScore: number;             // 0-100
  timesWorn: number;
  lastWorn?: string;                    // ISO 8601
  estimatedPrice?: number;
  brand?: string;
  collections: Collection[];            // Collections containing this item
}

export interface ComparisonMetric {
  name: string;                         // Metric name (e.g., "Versatilidad")
  values: (number | string | undefined)[]; // Values for each item
  unit?: string;                        // Unit (e.g., "%", "ARS")
  higherIsBetter?: boolean;             // For highlighting
}

export interface ComparisonResult {
  items: ComparisonItem[];              // Items being compared (2-4)
  metrics: ComparisonMetric[];          // Comparison metrics
  outfitSuggestions?: string[];         // Outfit IDs using these items
  similarityScore?: number;             // Overall similarity (0-100)
  recommendation?: string;              // AI recommendation
}

// =====================================================
// SEARCH SYSTEM
// =====================================================

export type SearchType = 'text' | 'image' | 'visual';

export interface SearchQuery {
  type: SearchType;
  text?: string;                        // Text query
  imageDataUrl?: string;                // Image for visual search
  visualFilters?: {
    colorPicker: string;                // Selected color (hex)
    similarityThreshold: number;        // 0-100
  };
}

export interface SearchResult {
  items: ClothingItem[];                // Matching items
  query: SearchQuery;                   // Original query
  totalResults: number;                 // Total matches
  searchTime: number;                   // Search time in ms
  suggestions?: string[];               // Search suggestions
}

export interface SearchHistory {
  id: string;
  query: SearchQuery;
  timestamp: string;                    // ISO 8601
  resultsCount: number;
}

// =====================================================
// IMPORT/EXPORT SYSTEM
// =====================================================

export type ExportFormat = 'json' | 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeImages?: boolean;              // Include image data
  includeMetadata?: boolean;            // Include all metadata
  includeStats?: boolean;               // Include statistics
  selectedItems?: string[];             // Export only selected items (null = all)
  collections?: string[];               // Export specific collections
}

export interface ImportOptions {
  format: 'json' | 'csv';
  mergeStrategy: 'replace' | 'merge' | 'skip';
  validateImages?: boolean;             // Validate image URLs
  autoCreateCollections?: boolean;      // Auto-create collections from tags
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors?: string[];                    // Error messages
  createdCollections?: Collection[];    // Auto-created collections
}

// =====================================================
// VIEW PREFERENCES (RESPONSIVE)
// =====================================================

export interface ViewPreferences {
  // Mobile preferences
  mobile: {
    defaultView: ViewMode;
    gridColumns: 2 | 3;                 // Portrait/landscape
    enableGestures: boolean;            // Swipe, long-press, etc.
    stickyHeader: boolean;              // Sticky search/filter header
    fabEnabled: boolean;                // Floating action button
    pullToRefresh: boolean;             // Pull to refresh
  };

  // Desktop preferences
  desktop: {
    defaultView: ViewMode;
    showSidebar: boolean;               // Show filter sidebar
    sidebarWidth: number;               // Sidebar width in px
    gridColumns: number;                // Grid columns (auto, 4, 5, 6, etc.)
    hoverEffects: boolean;              // Enable hover effects
    keyboardShortcuts: boolean;         // Enable keyboard shortcuts
  };

  // Shared preferences
  shared: {
    visualTheme: VisualTheme;           // Visual theme
    defaultSort: ExtendedSortOption;    // Default sort
    defaultFilters?: AdvancedFilters;   // Default filters
    showStats: boolean;                 // Show quick stats
    autoSave: boolean;                  // Auto-save preferences
  };
}

// =====================================================
// ANIMATION & TRANSITION CONFIGS
// =====================================================

export interface AnimationConfig {
  enableAnimations: boolean;            // Master switch
  staggerDelay: number;                 // Stagger delay in ms
  transitionDuration: number;           // Transition duration in ms
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
}

export interface SharedElementTransition {
  from: string;                         // Source element ID
  to: string;                           // Target element ID
  duration: number;                     // Transition duration in ms
}

// =====================================================
// KEYBOARD SHORTCUTS
// =====================================================

export interface KeyboardShortcut {
  key: string;                          // Key combination (e.g., "Ctrl+A")
  action: string;                       // Action name
  description: string;                  // Description
  handler: () => void;                  // Handler function
}

export interface KeyboardShortcutsConfig {
  enabled: boolean;
  shortcuts: KeyboardShortcut[];
}

// =====================================================
// RESPONSIVE BREAKPOINTS
// =====================================================

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
  currentBreakpoint: Breakpoint;
  breakpoints: {
    mobile: number;                     // < 768px
    tablet: number;                     // < 1024px
    desktop: number;                    // >= 1024px
  };
}

// =====================================================
// PERFORMANCE METRICS
// =====================================================

export interface PerformanceMetrics {
  renderTime: number;                   // Grid render time in ms
  filterTime: number;                   // Filter execution time in ms
  sortTime: number;                     // Sort execution time in ms
  totalItems: number;                   // Total items in closet
  visibleItems: number;                 // Currently visible items
  memoryUsage?: number;                 // Estimated memory usage in MB
}
