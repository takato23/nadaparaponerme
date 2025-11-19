import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface Product {
  id?: string;
  name: string;
  price: number;
  image?: string;
  brand?: string;
  url?: string;
  description?: string;
  inStock?: boolean;
}

export interface ProductCardProps {
  product: Product;
  onProductClick?: (product: Product) => void;
  showBrand?: boolean;
  showDescription?: boolean;
  className?: string;
}

/**
 * Reusable ProductCard component
 * Used in shopping recommendations, dupe finder, etc.
 */
export function ProductCard({
  product,
  onProductClick,
  showBrand = true,
  showDescription = false,
  className = ''
}: ProductCardProps) {
  const handleClick = () => {
    if (onProductClick) {
      onProductClick(product);
    } else if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      variant="glass"
      padding="none"
      rounded="2xl"
      onClick={handleClick}
      className={`overflow-hidden group ${className}`}
    >
      {/* Product Image */}
      {product.image && (
        <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        {showBrand && product.brand && (
          <p className="text-xs text-text-secondary dark:text-gray-500 mb-1 font-medium uppercase tracking-wide">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <h3 className="font-semibold text-text-primary dark:text-gray-200 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        {showDescription && product.description && (
          <p className="text-sm text-text-secondary dark:text-gray-400 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price and Stock Status */}
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-primary">
            ${product.price.toLocaleString('es-AR')}
          </p>

          {product.inStock !== undefined && (
            <Badge variant={product.inStock ? 'success' : 'error'} size="sm">
              {product.inStock ? 'En Stock' : 'Agotado'}
            </Badge>
          )}
        </div>

        {/* External link indicator */}
        {product.url && (
          <div className="mt-3 flex items-center gap-1 text-xs text-primary">
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Ver en tienda</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Product Grid Layout
 */
export interface ProductGridProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  showBrand?: boolean;
  showDescription?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ProductGrid({
  products,
  onProductClick,
  showBrand = true,
  showDescription = false,
  emptyMessage = 'No hay productos disponibles',
  className = ''
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id || index}
          product={product}
          onProductClick={onProductClick}
          showBrand={showBrand}
          showDescription={showDescription}
        />
      ))}
    </div>
  );
}
