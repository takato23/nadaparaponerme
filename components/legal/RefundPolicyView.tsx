import React from 'react';
import LegalTemplate from './LegalTemplate';

const UPDATED_AT = '7 de febrero de 2026';

export const RefundPolicyView: React.FC = () => {
  return (
    <LegalTemplate
      title="Política de Reembolsos"
      updatedAt={UPDATED_AT}
      intro={[
        'Esta Política explica cuándo ofrecemos reembolsos por suscripciones de No Tengo Nada Para Ponerme ("la App").',
        'Si tu pago fue por error o tenés un problema con la facturación, escribinos y lo revisamos.'
      ]}
      sections={[
        {
          title: '1. Cancelaciones',
          paragraphs: [
            'Podés cancelar tu suscripción en cualquier momento. La cancelación evita la renovación automática y el acceso pago se mantiene hasta el final del período ya abonado.',
            'No ofrecemos reembolsos por cancelaciones realizadas una vez iniciado el período de facturación, salvo los casos indicados abajo.'
          ]
        },
        {
          title: '2. Casos en los que podemos reembolsar',
          bullets: [
            'Cobro duplicado o facturación incorrecta.',
            'Pago no reconocido (sujeto a verificación).',
            'Problema técnico grave y generalizado que impida usar la App durante un período relevante.'
          ]
        },
        {
          title: '3. Casos en los que normalmente no reembolsamos',
          bullets: [
            'Cambio de opinión o falta de uso de la suscripción.',
            'Reembolsos parciales por tiempo no usado del período actual.',
            'Problemas causados por tu conexión, dispositivo o configuración local.'
          ]
        },
        {
          title: '4. Cómo solicitar un reembolso',
          paragraphs: [
            'Escribinos a soporte@ojodeloca.app con tu email de cuenta y la mayor cantidad de datos posible (fecha, monto, método de pago y motivo).',
            'Respondemos lo antes posible. En algunos casos podemos pedir información adicional para validar el reclamo.'
          ]
        },
        {
          title: '5. Procesadores de pago',
          paragraphs: [
            'En Argentina, los pagos se procesan mediante MercadoPago. En otros países podemos usar Paddle u otros procesadores.',
            'Los reembolsos, cuando corresponden, se ejecutan por el mismo procesador utilizado en la compra.'
          ]
        },
        {
          title: '6. Cambios',
          paragraphs: [
            'Podemos actualizar esta Política. Si los cambios son relevantes, los comunicaremos dentro de la App.'
          ]
        }
      ]}
    />
  );
};

export default RefundPolicyView;

