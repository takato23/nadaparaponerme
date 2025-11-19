#!/usr/bin/env node
/**
 * Setup Verification Script
 * Checks that all required environment variables and services are configured
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const symbols = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

console.log(`\n${colors.cyan}🔍 Gemini API Configuration Verification${colors.reset}`);
console.log('='.repeat(50));
console.log('');

// Check if .env.local exists
let envExists = false;
let envContent = '';
try {
  envContent = readFileSync(join(projectRoot, '.env.local'), 'utf8');
  envExists = true;
} catch (error) {
  // File doesn't exist
}

// Parse environment variables
const envVars = {};
if (envExists) {
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  });
}

// Verification checks
const checks = [
  {
    name: '.env.local file exists',
    check: () => envExists,
    severity: 'error',
    help: 'Copy .env.local.example to .env.local and configure your API keys',
  },
  {
    name: 'VITE_GEMINI_API_KEY is set',
    check: () => envVars.VITE_GEMINI_API_KEY && envVars.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here',
    severity: 'warning',
    help: 'Set your Gemini API key in .env.local for development. Get it from: https://makersuite.google.com/app/apikey',
  },
  {
    name: 'VITE_SUPABASE_URL is set',
    check: () => envVars.VITE_SUPABASE_URL && envVars.VITE_SUPABASE_URL !== 'https://your-project.supabase.co',
    severity: 'error',
    help: 'Configure your Supabase URL in .env.local',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY is set',
    check: () => envVars.VITE_SUPABASE_ANON_KEY && envVars.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here',
    severity: 'error',
    help: 'Configure your Supabase anon key in .env.local',
  },
  {
    name: 'VITE_OPENWEATHER_API_KEY is set',
    check: () => envVars.VITE_OPENWEATHER_API_KEY && envVars.VITE_OPENWEATHER_API_KEY !== 'your_openweathermap_api_key_here',
    severity: 'warning',
    help: 'Weather features require OpenWeatherMap API key. Get it from: https://openweathermap.org/api',
  },
];

let hasErrors = false;
let hasWarnings = false;

checks.forEach(({ name, check, severity, help }) => {
  const passed = check();

  if (passed) {
    console.log(`${colors.green}${symbols.success} ${name}${colors.reset}`);
  } else {
    if (severity === 'error') {
      console.log(`${colors.red}${symbols.error} ${name}${colors.reset}`);
      console.log(`  ${colors.yellow}→ ${help}${colors.reset}`);
      hasErrors = true;
    } else {
      console.log(`${colors.yellow}${symbols.warning} ${name}${colors.reset}`);
      console.log(`  ${colors.cyan}→ ${help}${colors.reset}`);
      hasWarnings = true;
    }
  }
});

console.log('');
console.log('='.repeat(50));

// Summary
if (!hasErrors && !hasWarnings) {
  console.log(`${colors.green}${symbols.success} All checks passed! You're ready to go.${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}Next steps:${colors.reset}`);
  console.log(`  1. Start development server: ${colors.blue}npm run dev${colors.reset}`);
  console.log(`  2. Configure Supabase secrets: ${colors.blue}supabase secrets set GEMINI_API_KEY=<your_key>${colors.reset}`);
  console.log(`  3. Deploy Edge Functions: ${colors.blue}supabase functions deploy${colors.reset}`);
  process.exit(0);
} else if (hasErrors) {
  console.log(`${colors.red}${symbols.error} Configuration errors found. Please fix them before continuing.${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}Quick fix:${colors.reset}`);
  console.log(`  1. Copy example file: ${colors.blue}cp .env.local.example .env.local${colors.reset}`);
  console.log(`  2. Edit .env.local with your API keys`);
  console.log(`  3. Run this script again: ${colors.blue}npm run verify-setup${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.yellow}${symbols.warning} Configuration has warnings but should work.${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}Optional improvements:${colors.reset}`);
  console.log(`  - Configure missing API keys for full functionality`);
  console.log(`  - See GEMINI_CONFIGURATION_ANALYSIS.md for details`);
  process.exit(0);
}
