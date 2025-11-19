/**
 * Script para activar Supabase en "No Tengo Nada Para Ponerme"
 *
 * Ejecutar en la consola del navegador (F12 > Console):
 * 1. Abrir http://localhost:3000
 * 2. Abrir DevTools (F12)
 * 3. Copiar y pegar todo este código
 * 4. Presionar Enter
 * 5. Recargar la página (F5)
 */

console.log('🚀 Activando Supabase...');

// Activar todos los feature flags
localStorage.setItem('ojodeloca-feature-flags', JSON.stringify({
  useSupabaseAuth: true,
  useSupabaseCloset: true,
  useSupabaseOutfits: true,
  useSupabaseAI: true,
  useSupabasePreferences: true,
  autoMigration: true
}));

// Limpiar estado de autenticación localStorage
localStorage.removeItem('ojodeloca-is-authenticated');

console.log('✅ Feature flags activados:');
console.log('   - useSupabaseAuth: true');
console.log('   - useSupabaseCloset: true');
console.log('   - useSupabaseOutfits: true');
console.log('   - useSupabaseAI: true');
console.log('   - useSupabasePreferences: true');
console.log('   - autoMigration: true');
console.log('');
console.log('🔄 Recarga la página (F5) para aplicar los cambios');
