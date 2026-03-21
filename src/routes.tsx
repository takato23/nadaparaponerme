/**
 * routes.tsx - Route Configuration for Fashion Assistant App
 *
 * Defines all application routes with their paths and components
 */

export const ROUTES = {
  // Main views
  HOME: '/',
  CLOSET: '/armario',
  PLANNER: '/planificador',
  COMMUNITY: '/comunidad',
  COMMUNITY_LEGACY: '/amigos',
  SAVED: '/guardados',
  STYLIST: '/estilista',
  KUMBI: '/kumbi',
  PROFILE: '/perfil',
  ONBOARDING_STYLIST: '/stylist-onboarding',
  ONBOARDING_LAB: '/onboarding-lab',
  ONBOARDING_MOCK: '/onboarding-mock',
  ENTRY_MOCK: '/entry-mock',
  ENTRY_EYE_MOCK: '/entry-eye-mock',
  DASHBOARD_MOCKUP: '/dashboard-mockup',

  // Feature views
  VIRTUAL_TRY_ON: '/prueba-virtual',
  SMART_PACKER: '/smart-packer',
  ACTIVITY: '/actividad',
  VIRTUAL_SHOPPING: '/compras',
  BULK_UPLOAD: '/subir-prendas',
  MULTIPLAYER_CHALLENGES: '/desafios',
  CAPSULE_BUILDER: '/capsulas',

  // Nested/detail views
  OUTFIT_DETAIL: '/outfit/:id',
  STUDIO: '/studio',
  STUDIO_MIRROR: '/studio/espejo',
  STUDIO_PHOTOSHOOT: '/studio/fotografia',
  SAVED_LOOKS: '/armario-de-looks',
  SHARED_LOOK: '/look/:token',
  TERMS: '/legal/terminos',
  PRIVACY: '/legal/privacidad',
  REFUND: '/legal/reembolsos',

  // Subscription pages
  PRICING: '/pricing',
  PLANES: '/planes',
  PAY: '/pay',
  BETA_INVITE: '/invitacion',

} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];
