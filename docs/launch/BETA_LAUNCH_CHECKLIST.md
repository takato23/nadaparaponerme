# Beta Launch Checklist

## 1. Funnel

- Revisar `/` en mobile real y confirmar que el flujo sea `hero -> preview -> auth` sin scroll vertical.
- Probar `/?auth=login`, `/?auth=signup` y `/stylist-onboarding`.
- Confirmar que el ojo de ThreeJS carga en dispositivos reales y que el fallback no rompe la pantalla.
- Verificar que despues del login la intencion elegida te mande al primer paso correcto.

## 2. Invites

- Generar al menos un link beta desde perfil admin.
- Abrirlo en una sesion limpia y confirmar claim correcto.
- Revisar trazabilidad de `invites` y `claims` desde perfil admin.
- Probar link agotado y link invalido.

## 3. Pagos

- Hacer una compra real o sandbox en ARS con MercadoPago.
- Confirmar callback `success`, `pending` y `failure`.
- Validar que la suscripcion se vea activa al volver a la app.
- Confirmar fallback si el webhook tarda: refrescar cuenta y revisar upgrade.
- Verificar textos de soporte visibles en `/pricing` y en el modal de paywall.

## 4. PWA

- Instalar la app en iPhone y Android.
- Confirmar icono, nombre, splash y apertura en standalone.
- Verificar shortcuts del manifest.
- Cortar internet y comprobar fallback offline.
- Abrir una nueva version y confirmar que el service worker actualiza sin dejar la app vieja clavada.

## 5. Soporte

- Abrir el boton `Soporte beta` dentro de la app.
- Enviar un reporte y confirmar insercion en `error_reports`.
- Probar fallback por mail e Instagram.
- Tener a mano una respuesta corta para cobro no acreditado, bug critico y pedido de acceso beta.

## 6. Analytics

- Confirmar eventos de entrada publica, auth, checkout y compra.
- Verificar que no se mezclen eventos de `onboarding-lab` con produccion.
- Guardar UTMs en links de Instagram para saber que historia/post convierte.

## 7. QA Minimo

- Subir prenda al armario.
- Generar look.
- Abrir estudio.
- Guardar y reabrir look.
- Abrir perfil.
- Abrir paywall.
- Instalar PWA.

## 8. Go/No-Go

- Si falla onboarding, cobro o armario: no lanzar.
- Si solo hay detalles cosmeticos menores: lanzar con soporte atento.
- Primer lanzamiento recomendado: cupos beta limitados con monitoreo manual de claims, pagos y reportes.
