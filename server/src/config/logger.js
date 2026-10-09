import { isProd, isTest } from '../config/env.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const activeLevel = LEVELS[isProd ? 'info' : 'debug'];

const colors = {
  debug: '\u001b[90m',
  info: '\u001b[36m',
  warn: '\u001b[33m',
  error: '\u001b[31m',
  reset: '\u001b[0m',
};

function emit(level, message, meta) {
  if (LEVELS[level] < activeLevel) return;
  if (isTest) return;
  const stamp = new Date().toISOString();
  const prefix = `${colors[level]}${stamp} [${level.toUpperCase()}]${colors.reset}`;
  if (meta && Object.keys(meta).length > 0) {
    console.log(`${prefix} ${message}`, meta);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
};
