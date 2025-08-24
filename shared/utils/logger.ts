/**
 * Production-safe logging utility
 * Logs are automatically removed in production builds via Babel plugin
 */

const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    // Keep warnings in production for debugging critical issues
    console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Keep errors in production for debugging critical issues
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Alternative: Use this instead of console.log throughout your app
export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};
