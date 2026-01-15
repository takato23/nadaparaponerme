export const CATEGORY_LABELS: Record<string, string> = {
    top: 'Partes de Arriba',
    bottom: 'Partes de Abajo',
    shoes: 'Calzado',
    outerwear: 'Abrigos',
    dress: 'Vestidos / Enteritos',
    accessory: 'Accesorios',
    all: 'Todo'
};

export function getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category.toLowerCase()] || category;
}
