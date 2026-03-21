# Beta Operations Runbook

## Checklist diaria

- Revisar nuevos `claims` beta desde perfil admin.
- Revisar pagos que volvieron con `pending` o con soporte asociado.
- Revisar reportes en `error_reports`.
- Verificar eventos principales en PostHog:
  - `beta_invite_claimed`
  - `signup_completed`
  - `first_item_added`
  - `first_outfit_generated`
  - `checkout_started`
  - `subscription_activated`

## Respuestas operativas

### Pago no impactado

- Confirmar email de cuenta.
- Confirmar hora aproximada del cobro y medio de pago.
- Revisar callback y estado de suscripción.
- Si el cobro existe, forzar refresh o reprocesar antes de pedirle al usuario que espere.

### Link beta inválido o agotado

- Generar nuevo link desde admin.
- Enviar link nuevo con aclaración de cupo y vencimiento.
- Si el usuario ya reclamó acceso, pedirle que cierre sesión y vuelva a entrar con la cuenta correcta.

### Bug crítico de armario o Studio

- Pedir ruta exacta, captura y email.
- Confirmar si el reporte quedó en `error_reports`.
- Priorizar si bloquea:
  - login
  - guardado de prenda
  - generación de look
  - checkout

## Señales para pausar el lanzamiento

- Fallan claims beta válidos.
- Fallan callbacks de pago o no se activan planes.
- Se rompe guardado de prendas o generación de looks en móviles reales.
- El service worker deja sesiones viejas o pantallas rotas tras update.

## Kumbi: smoke audit por release

- Confirmar en Supabase que estén `ACTIVE`:
  - `chat-stylist`
  - `analyze-look`
  - `generate-outfit`
  - `shopping-assistant`
  - `virtual-try-on`
  - `prepare-closet-insights`
  - `style-dna-analysis`
- Recorrer con una cuenta QA autenticada:
  - `Armario -> Kumbi -> completame un look`
  - `Armario -> Kumbi -> abrir prenda recomendada`
  - `Looks -> Kumbi -> guardar en Looks`
  - `Looks propios -> usar con Kumbi` y verificar que aparezca la referencia visual
  - `Kumbi -> Abrir wishlist`
  - `Kumbi -> Abrir looks guardados`
  - `Kumbi -> Abrir en Studio`
- Verificar estados vacíos:
  - sin armario
  - sin looks
  - analyze-look fallando
  - respuesta sin outfitSuggestion

## Kumbi: qué mirar en PostHog

- `kumbi_surface_opened`
- `kumbi_response_rendered`
- `kumbi_ui_action_triggered`
- `stylist_action_requested`
- `stylist_action_completed`
- `stylist_action_failed`
- `stylist_reco_requested`
- `stylist_reco_candidate_shown`

## Rollback rápido

- Si falla el flujo de looks propios:
  - apagar `enableAnalyzeLookEntry`
  - apagar `enableKumbiReferenceLookSeeding`
- Si Studio queda inestable:
  - apagar `enableStudioKumbiActions`
- Si querés ocultar temporalmente la entrada looks-first:
  - apagar `enableLooksFirstUpload`
