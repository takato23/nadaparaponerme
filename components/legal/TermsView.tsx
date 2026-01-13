import React from 'react';
import LegalTemplate from './LegalTemplate';

const UPDATED_AT = '9 de enero de 2026';

export const TermsView: React.FC = () => {
  return (
    <LegalTemplate
      title="Términos y Condiciones"
      updatedAt={UPDATED_AT}
      intro={[
        'Al crear una cuenta o usar No Tengo Nada Para Ponerme ("la App"), aceptás estos Términos. Si no estás de acuerdo, no uses el servicio.',
        'Estos Términos aplican a todas las funciones, incluidas las herramientas de IA, el armario digital y el probador virtual.'
      ]}
      sections={[
        {
          title: '1. Elegibilidad y cuenta',
          paragraphs: [
            'Debés tener al menos 13 años para usar la App. Si sos menor de 18, declarás contar con autorización de tu madre, padre o tutor.',
            'Sos responsable de la actividad que ocurra en tu cuenta y de mantener tus credenciales seguras.'
          ]
        },
        {
          title: '2. Descripción del servicio',
          paragraphs: [
            'La App permite digitalizar tu armario, generar looks y usar funciones de IA para sugerencias de estilo, análisis de prendas y pruebas virtuales.',
            'El servicio puede evolucionar: algunas funciones pueden cambiar, suspenderse o requerir pago.'
          ]
        },
        {
          title: '3. Uso permitido y restricciones',
          bullets: [
            'No uses la App para actividades ilegales o dañinas.',
            'No subas contenido que infrinja derechos de terceros, sea violento, sexual explícito o involucre menores.',
            'No intentes vulnerar la seguridad, interferir con el servicio o abusar de los sistemas de IA.'
          ]
        },
        {
          title: '4. Contenido del usuario',
          paragraphs: [
            'Conservás la titularidad de las fotos y datos que subís.',
            'Nos otorgás una licencia no exclusiva para procesarlos con el fin de prestar el servicio (por ejemplo, generar looks o análisis).'
          ]
        },
        {
          title: '5. IA y resultados',
          paragraphs: [
            'Las salidas de IA pueden contener errores o no ajustarse a tus expectativas. Usá tu criterio antes de tomar decisiones basadas en ellas.',
            'No garantizamos resultados perfectos ni exactitud en los detalles de las prendas o del look generado.'
          ]
        },
        {
          title: '6. Créditos y suscripciones',
          paragraphs: [
            'El acceso a funciones de IA se mide en créditos mensuales. Cada acción consume créditos según su costo.',
            'Los créditos se reinician mensualmente y no son acumulables. Las condiciones pueden variar entre planes Free, Pro y Premium.'
          ]
        },
        {
          title: '7. Pagos y facturación',
          paragraphs: [
            'En Argentina, los pagos se procesan mediante MercadoPago. En otros países podemos usar otros procesadores.',
            'Los impuestos, cargos bancarios o de conversión pueden aplicarse según tu país o entidad emisora.'
          ]
        },
        {
          title: '8. Cancelaciones y reembolsos',
          paragraphs: [
            'Podés cancelar tu suscripción en cualquier momento. El acceso pago se mantiene hasta el final del período vigente.',
            'Los reembolsos se evalúan según el caso y la normativa aplicable.'
          ]
        },
        {
          title: '9. Propiedad intelectual',
          paragraphs: [
            'Todo el diseño, marca, software y contenidos de la App son propiedad nuestra o de nuestros licenciantes.',
            'No se permite copiar, distribuir ni modificar la App sin autorización.'
          ]
        },
        {
          title: '10. Limitación de responsabilidad',
          paragraphs: [
            'La App se ofrece “tal cual”. No garantizamos disponibilidad continua ni ausencia de errores.',
            'No somos responsables por daños indirectos, pérdida de datos o decisiones tomadas en base a las sugerencias de IA.'
          ]
        },
        {
          title: '11. Modificaciones',
          paragraphs: [
            'Podemos actualizar estos Términos. Si los cambios son relevantes, te lo informaremos en la App o por email.'
          ]
        },
        {
          title: '12. Contacto',
          paragraphs: [
            'Si tenés dudas, escribinos a soporte@ojodeloca.app.'
          ]
        }
      ]}
    />
  );
};

export default TermsView;
