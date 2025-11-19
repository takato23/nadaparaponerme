// Test script para verificar si la API key de Gemini funciona
// Ejecutar con: node test-api-key.js

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: resolve(__dirname, '.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('\n🔍 Diagnóstico de API Key de Gemini\n');

// Test 1: Verificar que la key existe
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY no encontrada en .env.local');
  console.log('   Verificá que el archivo .env.local tenga la línea:');
  console.log('   GEMINI_API_KEY=tu_key_aqui\n');
  process.exit(1);
}

console.log('✅ API key encontrada en .env.local');
console.log(`   Longitud: ${GEMINI_API_KEY.length} caracteres`);
console.log(`   Formato: ${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}\n`);

// Test 2: Verificar formato básico
if (!GEMINI_API_KEY.startsWith('AIza')) {
  console.warn('⚠️  ADVERTENCIA: La API key no tiene el formato esperado (debería empezar con "AIza")');
}

// Test 3: Hacer una llamada simple a la API
console.log('🔄 Testeando conexión con Gemini API...\n');

const testApiKey = async () => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Say "Hello World" in one word'
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ ERROR en la API de Gemini:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${JSON.stringify(data, null, 2)}\n`);

      // Diagnosticar errores comunes
      if (response.status === 403) {
        console.log('📋 POSIBLES CAUSAS:');
        console.log('   1. API key reportada como filtrada (leaked)');
        console.log('   2. API no habilitada en Google Cloud Console');
        console.log('   3. Restricciones de IP o referrer en la key');
        console.log('   4. Cuota excedida o billing no configurado\n');

        console.log('🔧 SOLUCIONES:');
        console.log('   1. Crear API key en una cuenta NUEVA de Google');
        console.log('   2. Ir a https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
        console.log('   3. Habilitar "Generative Language API"');
        console.log('   4. En https://console.cloud.google.com/apis/credentials');
        console.log('      - Crear nueva API key');
        console.log('      - NO poner restricciones (dejar "None")');
        console.log('   5. Copiar la key DIRECTAMENTE a .env.local\n');
      } else if (response.status === 429) {
        console.log('📋 Cuota excedida. Esperá unos minutos o creá otra cuenta.\n');
      } else if (response.status === 400) {
        console.log('📋 Petición inválida. El formato de la API key podría estar corrupto.\n');
      }

      process.exit(1);
    }

    console.log('✅ ¡API key funciona correctamente!');
    console.log(`   Respuesta: ${data.candidates[0].content.parts[0].text}\n`);
    console.log('🎉 Podés usar las funciones de IA en la app sin problemas.\n');

  } catch (error) {
    console.error('❌ ERROR de red al conectar con Gemini:');
    console.error(`   ${error.message}\n`);
    console.log('📋 Verificá tu conexión a internet.\n');
    process.exit(1);
  }
};

testApiKey();
