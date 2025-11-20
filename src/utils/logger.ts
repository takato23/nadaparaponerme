/**
 * Logger Utility
 *
 * Centralized logging system that can be easily configured
 * for different environments (development, production, test)
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel[];
}

// Default configuration
const defaultConfig: LoggerConfig = {
  enabled: import.meta.env.DEV, // Only log in development by default
  level: ['log', 'info', 'warn', 'error', 'debug'],
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure logger behavior
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Check if a log level is enabled
 */
function isLevelEnabled(level: LogLevel): boolean {
  return config.enabled && config.level.includes(level);
}

/**
 * Logger object with standard console methods
 */
export const logger = {
  log(...args: any[]): void {
    if (isLevelEnabled('log')) {
      console.log(...args);
    }
  },

  info(...args: any[]): void {
    if (isLevelEnabled('info')) {
      console.info(...args);
    }
  },

  warn(...args: any[]): void {
    if (isLevelEnabled('warn')) {
      console.warn(...args);
    }
  },

  error(...args: any[]): void {
    if (isLevelEnabled('error')) {
      console.error(...args);
    }
  },

  debug(...args: any[]): void {
    if (isLevelEnabled('debug')) {
      console.debug(...args);
    }
  },
};
