export interface Feature {
    id: string;
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
    category: 'essential' | 'create' | 'social' | 'advanced';
    keywords: string[];
    tooltip?: string;
    badge?: string;
}
