import type { BadgeType, FeatureCategory } from './featuresConfig';

export interface Feature {
    id: string;
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
    category: FeatureCategory;
    keywords: string[];
    tooltip?: string;
    badge?: BadgeType;
    featured?: boolean;
    popularity?: number;
}
