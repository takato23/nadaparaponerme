/**
 * Payment & Subscription Types
 *
 * Types for MercadoPago integration and subscription management
 */

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  description: string;
  price_monthly_ars: number;  // Price in Argentine Pesos
  price_monthly_usd: number;  // Price in USD
  features: string[];
  limits: {
    ai_generations_per_month: number;
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

  // Usage tracking
  ai_generations_used: number;

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
  | 'stripe_card';

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

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string;

  amount: number;
  currency: 'ARS' | 'USD';
  status: PaymentStatus;

  // Payment provider details
  provider: 'mercadopago' | 'stripe';
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
    description: 'Probate outfits con tu foto',
    icon: 'checkroom',
    required_tier: 'pro',
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
    required_tier: 'premium',
    is_premium: true,
  },
  {
    id: 'unlimited_ai',
    name: 'Créditos IA',
    description: '400 créditos IA por mes',
    icon: 'all_inclusive',
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
    description: 'Para empezar a organizar tu armario',
    price_monthly_ars: 0,
    price_monthly_usd: 0,
    features: [
      'Hasta 50 prendas en tu armario',
      '10 créditos IA por mes (Rápido)',
      'Análisis básico de color',
      'Outfits guardados ilimitados',
      'Compartir en comunidad',
    ],
    limits: {
      ai_generations_per_month: 10,
      max_closet_items: 50,
      max_saved_outfits: -1,  // Unlimited
      can_use_virtual_tryon: false,
      can_use_ai_designer: false,
      can_use_lookbook: false,
      can_use_style_dna: false,
      can_export_lookbooks: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para fashionistas serios',
    price_monthly_ars: 2999,
    price_monthly_usd: 9.99,
    features: [
      'Todo lo de Free +',
      'Prendas ilimitadas',
      '150 créditos IA por mes',
      'Probador virtual Rápido',
      'Ultra habilitado',
      'AI Fashion Designer',
      'Lookbook Creator',
      'Exportar lookbooks en HD',
      'Análisis avanzado de gaps',
      'Sin anuncios',
    ],
    limits: {
      ai_generations_per_month: 150,
      max_closet_items: -1,  // Unlimited
      max_saved_outfits: -1,  // Unlimited
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: false,
      can_export_lookbooks: true,
    },
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Experiencia completa con IA avanzada',
    price_monthly_ars: 4999,
    price_monthly_usd: 16.99,
    features: [
      'Todo lo de Pro +',
      '400 créditos IA por mes',
      'Style DNA Profile completo',
      'Análisis de evolución de estilo',
      'Recomendaciones personalizadas diarias',
      'Acceso anticipado a features',
      'Soporte prioritario',
    ],
    limits: {
      ai_generations_per_month: 400,
      max_closet_items: -1,  // Unlimited
      max_saved_outfits: -1,  // Unlimited
      can_use_virtual_tryon: true,
      can_use_ai_designer: true,
      can_use_lookbook: true,
      can_use_style_dna: true,
      can_export_lookbooks: true,
    },
  },
];
