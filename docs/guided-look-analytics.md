# Guided Look Analytics

## Objetivo
Medir el funnel completo del flujo guiado de creacion de look dentro del chat.

## Eventos esperados
- `guided_look_start`
- `guided_look_field_completed`
- `guided_look_cost_shown`
- `guided_look_confirmed`
- `guided_look_generation_success`
- `guided_look_generation_error`
- `guided_look_saved`
- `guided_look_outfit_requested`
- `guided_look_upgrade_cta_click`

## Propiedades estandar
- `session_id`
- `category`
- `occasion`
- `style`
- `error_code`
- `latency_ms`
- `credits_charged`

## Funnel minimo recomendado
1. `guided_look_start`
2. `guided_look_confirmed`
3. `guided_look_generation_success`
4. `guided_look_saved`
5. `guided_look_outfit_requested`

## Alertas recomendadas
- Error rate de generacion: `guided_look_generation_error / guided_look_confirmed > 15%` en ventana de 15 min.
- Timeout rate: `error_code = GENERATION_TIMEOUT` sobre confirmados > `8%` en ventana de 15 min.
- Mismatch de cobro: sesiones con `guided_look_generation_success` y `credits_charged != 2`.
