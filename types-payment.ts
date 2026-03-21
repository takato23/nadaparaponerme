/**
 * Payment & Subscription Types
 *
 * Types for MercadoPago integration and subscription management.
 *
 * 4-tier hybrid model: Free / Plus / Pro / Premium
 * - Subscription for continuous value (closet, planner, stylist)
 * - Try-on packs for burst / expensive usage
 */

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export type SubscriptionTier = 'free' | 'plus' | 'pro' | 'premium';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  description: string;
  price_monthly_ars: number;  // Price in Argentine Pesos
  price_monthly_usd: number;  // Price in USD
  features: string[];
  limits: {
    ai_uses_per_month: number;
    tryon_per_month: number;
    max_closet_items: number;
    max_saved_outfits: number;
    can_use_virtual_tryon: boolean;
    can_use_ai_designer: boolean;
    can_use_lookbook: boolean;
    can_use_style_dna: boolean;
    can_export_lookbooks: boolean;
  };
  popular?: boolean;  // Badge for most popular plan
}

// ============================================================================
// TRY-ON PACKS
// ============================================================================

export interface TryOnPack {
  id: string;
  name: string;
  description: string;
  tryon_count: number;
  price_ars: number;
  price_usd: number;
  popular?: boolean;
}

export const TRYON_PACKS: TryOnPack[] = [
  {
    id: 'pack_basic',
    name: 'Pack Básico',
    description: '3 probadas extra',
    tryon_count: 3,
    price_ars: 2990,
    price_usd: 1.99,
  },
  {
    id: 'pack_pro',
    name: 'Pack Pro',
    description: '5 probadas extra',
    tryon_count: 5,
    price_ars: 4490,
    price_usd: 2.99,
    popular: true,
  },
  {
    id: 'pack_evento',
    name: 'Pack Evento',
    description: '10 probadas para tu evento o viaje',
    tryon_count: 10,
    price_ars: 7990,
    price_usd: 4.99,
  },
];

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export type SubscriptionStatus =
  | 'active'           // Currently subscribed and paid
  | 'past_due'         // Payment failed, grace period
  | 'canceled'         // User canceled, end of period
  | 'expired'          // Subscription ended
  | 'trialing'         // In trial period
  | 'paused';          // Temporarily paused

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Billing
  current_period_start: string;  // ISO date
  current_period_end: string;    // ISO date
  cancel_at_period_end: boolean;
  canceled_at?: string | null;   // ISO date

  // Payment details
  payment_method: PaymentMethod;
  mercadopago_subscription_id?: string;
  paddle_subscription_id?: string;

  // Usage tracking
  ai_generations_used: number;
  tryon_used: number;
  tryon_bonus: number; // Extra try-ons from packs

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

export type PaymentMethod =
  | 'mercadopago_credit_card'
  | 'mercadopago_debit_card'
  | 'mercadopago_cash'
  | 'mercadopago_bank_transfer'
  | 'stripe_card'
  | 'paddle_card';

export interface PaymentMethodDetails {
  id: string;
  user_id: string;
  type: PaymentMethod;

  // Card details (if applicable)
  last_four?: string;
  brand?: string;  // visa, mastercard, etc
  exp_month?: number;
  exp_year?: number;

  // MercadoPago specific
  mercadopago_customer_id?: string;
  mercadopago_card_id?: string;

  is_default: boolean;
  created_at: string;
}

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export type PaymentType = 'subscription' | 'tryon_pack';

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string;

  amount: number;
  currency: 'ARS' | 'USD';
  status: PaymentStatus;
  type: PaymentType;

  // Payment provider details
  provider: 'mercadopago' | 'stripe' | 'paddle';
  provider_transaction_id: string;
  provider_payment_method_id?: string;

  // Metadata
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MERCADOPAGO SPECIFIC
// ============================================================================

export interface MercadoPagoPreference {
  id: string;
  init_point: string;  // URL to redirect user
  sandbox_init_point?: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    quantity: number;
    unit_price: number;
    currency_id: 'ARS' | 'USD';
  }>;
  payer?: {
    email: string;
    name?: string;
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;  // Our subscription_id
}

export interface MercadoPagoWebhookNotification {
  action: 'payment.created' | 'payment.updated';
  api_version: string;
  data: {
    id: string;  // payment ID
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: 'payment';
  user_id: string;
}

export interface MercadoPagoPaymentDetails {
  id: number;
  status: 'approved' | 'pending' | 'rejected' | 'refunded' | 'cancelled';
  status_detail: string;
  external_reference?: string;
  transaction_amount: number;
  currency_id: string;
  payer: {
    id: string;
    email: string;
  };
  payment_method_id: string;
  payment_type_id: string;
  date_created: string;
  date_approved?: string;
}

// ============================================================================
// PAYWALL FEATURES
// ============================================================================

export interface PaywallFeature {
  id: string;
  name: string;
  description: string;
  icon: string;  // Material icon name
  required_tier: SubscriptionTier;
  is_premium: boolean;
}

export const PAYWALL_FEATURES: PaywallFeature[] = [
  {
    id: 'ai_designer',
    name: 'AI Fashion Designer',
    description: 'Genera prendas personalizadas con IA',
    icon: 'auto_awesome',
    required_tier: 'pro',
    is_premium: false,
  },
  {
    id: 'virtual_tryon',
    name: 'Probador Virtual',
    description: 'Probate looks con tu foto',
    icon: 'checkroom',
    required_tier: 'plus',
    is_premium: false,
  },
  {
    id: 'lookbook_creator',
    name: 'Lookbook Creator',
    description: 'Crea lookbooks profesionales',
    icon: 'collections',
    required_tier: 'pro',
    is_premium: false,
  },
  {
    id: 'style_dna',
    name: 'Style DNA Profile',
    description: 'Análisis profundo de tu estilo',
    icon: 'psychology',
    required_tier: 'pro',
    is_premium: false,
  },
  {
    id: 'export_lookbooks',
    name: 'Exportación HD',
    description: 'Exportá lookbooks en alta resolución',
    icon: 'download',
    required_tier: 'premium',
    is_premium: true,
  },
];

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface UsageMetrics {
  user_id: string;
  subscription_tier: SubscriptionTier;

  // Monthly limits
  ai_generations_used: number;
  ai_generations_limit: number;

  // Try-on tracking
  tryon_used: number;
  tryon_limit: number;
  tryon_bonus: number;

  // Feature usage
  virtual_tryon_count: number;
  lookbook_created_count: number;

  // Timestamps
  period_start: string;
  period_end: string;
  last_reset: string;
}

// ============================================================================
// SUBSCRIPTION PLANS CONFIGURATION
// ============================================================================

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para probar y armar tu armario',
    price_monthly_ars: 0,
    price_monthly_usd: 0,
    features: [
      'Hasta 100 prendas en tu armario',
      'Outfits básicos',
      'Asistente de estilo incluido',
      '1 probada de bienvenida',
    ],
    limits: {
      ai_uses_per_month: 50,
      tryon_per_month: 1,
      max_closet_items: 100,
      max_saved_outfits: -1,  // Unlimited
      can_use_virtual_tryon: true,
      can_use_ai_designer: false,
      can_use_lookbook: false,
      can_use_style_dna: false,
      can_export_lookbooks: false,
    },
  },
  {
    id: 'plus',
    name: 'Plus',
    description: 'Desbloqueá shopping real para completar tus looks',
    price_monthly_ars: 7990,
    price_monthly_usd: 7.99,
    features: [
      'Hasta 250 prendas',
      '150 análisis de prendas por mes',
      '600 mensajes de Kumbi por mes',
      '8 búsquedas de shopping real por mes',
      '4 try-ons por mes',
    ],
    limits: {
      ai_uses_per_month: 150,
      tryon_per_month: 4,
      max_closet_items: 250,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: false,
      can_use_lookbook: false,
      can_use_style_dna: false,
      can_export_lookbooks: false,
    },
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para uso intensivo de Kumbi, shopping real y capa visual premium',
    price_monthly_ars: 10990,
    price_monthly_usd: 10.99,
    features: [
      'Hasta 600 prendas',
      '400 análisis de prendas por mes',
      '1500 mensajes de Kumbi por mes',
      '20 búsquedas de shopping real por mes',
      '8 try-ons por mes',
      'AI Fashion Designer',
      'Style DNA completo',
      'Lookbook Creator',
    ],
    limits: {
      ai_uses_per_month: 400,
      tryon_per_month: 8,
      max_closet_items: 600,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: true,
      can_export_lookbooks: false,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'La experiencia completa sin límites',
    price_monthly_ars: 17990,
    price_monthly_usd: 11.99,
    features: [
      'Hasta 1.500 prendas',
      'Todo lo de Pro',
      '18 probadas por mes',
      'Exportación HD de lookbooks',
      'Style DNA + evolución de estilo',
      'Acceso anticipado a features',
      'Soporte prioritario',
    ],
    limits: {
      ai_uses_per_month: 500,
      tryon_per_month: 18,
      max_closet_items: 1500,
      max_saved_outfits: -1,
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: true,
      can_export_lookbooks: true,
    },
  },
];
