# PostHog Beta Dashboard

## Funnel principal

1. `public_entry_viewed`
2. `auth_opened`
3. `signup_completed` o `login`
4. `beta_invite_claimed`
5. `first_item_added`
6. `first_look_generated`
7. `first_look_saved`
8. `look_shared`
9. `paywall_viewed`
10. `checkout_started`
11. `checkout_callback_received`
12. `subscription_activated`

## Breakdown recomendado

- `utm_source`
- `utm_campaign`
- `subscription_tier`
- `beta_access`
- `app_access`
- `payment_status`
- `provider`

## Replays a revisar

- Usuarios con `checkout_callback_received` sin `subscription_activated`
- Usuarios con `beta_invite_claimed` pero sin `first_item_added`
- Usuarios con `bug_report_submitted`

## Dashboard Kumbi

### Funnel mínimo

1. `kumbi_surface_opened`
2. `stylist_action_requested`
3. `kumbi_response_rendered`
4. `kumbi_ui_action_triggered`
5. `stylist_action_completed` o `stylist_action_failed`

### Breakdown recomendado

- `surface`
- `source`
- `entry_mode`
- `action_type`
- `has_outfit`
- `has_actions`
- `has_references`
- `has_shopping`

### Preguntas operativas

- ¿Qué superficie abre más Kumbi?
- ¿Dónde responde sin acciones útiles?
- ¿Dónde responde sin outfit?
- ¿Qué CTA se toca más?
- ¿Qué superficie falla más seguido?
