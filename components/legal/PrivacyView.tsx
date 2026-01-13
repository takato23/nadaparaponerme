import React from 'react';
import LegalTemplate from './LegalTemplate';

const UPDATED_AT = '9 de enero de 2026';

export const PrivacyView: React.FC = () => {
  return (
    <LegalTemplate
      title="Política de Privacidad"
      updatedAt={UPDATED_AT}
      intro={[
        'Esta Política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos al usar la App.'
      ]}
      sections={[
        {
          title: '1. Datos que recopilamos',
          bullets: [
            'Datos de cuenta: email, nombre, foto de perfil (si la proveés).',
            'Contenido del armario: fotos de prendas, etiquetas, notas y categorías.',
            'Fotos de rostro y cuerpo para el probador virtual (si las subís).',
            'Datos de uso: funciones utilizadas, métricas de rendimiento, errores.',
            'Datos técnicos: dispositivo, navegador, IP, idioma y región aproximada.'
          ]
        },
        {
          title: '2. Cómo usamos tus datos',
          bullets: [
            'Prestar el servicio (armario, IA, probador virtual).',
            'Mejorar la calidad del producto y la experiencia.',
            'Prevenir fraude y abusos.',
            'Analítica de producto (por ejemplo, Google Analytics) para entender el uso.'
          ]
        },
        {
          title: '3. Base legal',
          paragraphs: [
            'Tratamos tus datos para ejecutar el servicio que solicitás, cumplir obligaciones legales y, cuando corresponde, con tu consentimiento.'
          ]
        },
        {
          title: '4. Compartición de datos',
          paragraphs: [
            'No vendemos tu información. Solo compartimos datos con proveedores necesarios para operar la App (hosting, bases de datos, analítica, IA y pagos).'
          ]
        },
        {
          title: '5. Pagos',
          paragraphs: [
            'Los pagos son procesados por terceros (por ejemplo, MercadoPago en Argentina). No almacenamos los datos completos de tu tarjeta.'
          ]
        },
        {
          title: '6. Retención',
          paragraphs: [
            'Conservamos tus datos mientras tu cuenta esté activa o cuando sea necesario para prestar el servicio. Podés solicitar la eliminación.'
          ]
        },
        {
          title: '7. Seguridad',
          paragraphs: [
            'Aplicamos medidas de seguridad razonables para proteger tu información. Ningún sistema es 100% seguro, pero trabajamos para reducir riesgos.'
          ]
        },
        {
          title: '8. Tus derechos',
          paragraphs: [
            'Podés solicitar acceso, rectificación o eliminación de tus datos, y retirar tu consentimiento cuando aplique. Escribinos a soporte@ojodeloca.app.'
          ]
        },
        {
          title: '9. Cookies y analítica',
          paragraphs: [
            'Usamos cookies y herramientas de analítica para entender cómo se usa la App y mejorarla. Podés limitar cookies desde tu navegador.'
          ]
        },
        {
          title: '10. Cambios',
          paragraphs: [
            'Podemos actualizar esta Política. Si los cambios son relevantes, los comunicaremos dentro de la App.'
          ]
        }
      ]}
    />
  );
};

export default PrivacyView;
