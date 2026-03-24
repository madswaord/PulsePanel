import dotenv from 'dotenv';

dotenv.config();

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/$/, '');
}

export function loadConfig() {
  const config = {
    app: {
      port: Number(process.env.PORT || 8710),
      timezone: process.env.TIMEZONE || 'Asia/Shanghai',
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    opnsense: {
      baseUrl: normalizeBaseUrl(process.env.OPNSENSE_BASE_URL || ''),
      apiKey: process.env.OPNSENSE_API_KEY || '',
      apiSecret: process.env.OPNSENSE_API_SECRET || '',
      verifyTls: toBool(process.env.VERIFY_TLS, false),
      timeoutMs: Number(process.env.OPNSENSE_TIMEOUT_MS || 10000)
    },
    features: {
      enableCaddyLogs: toBool(process.env.ENABLE_CADDY_LOGS, false),
      enableDnsLogs: toBool(process.env.ENABLE_DNS_LOGS, false),
      trafficProvider: process.env.TRAFFIC_PROVIDER || 'core'
    }
  };

  return config;
}

export function getConfigSummary(config) {
  return {
    app: config.app,
    opnsense: {
      baseUrl: config.opnsense.baseUrl,
      configured: Boolean(config.opnsense.baseUrl && config.opnsense.apiKey && config.opnsense.apiSecret),
      verifyTls: config.opnsense.verifyTls,
      timeoutMs: config.opnsense.timeoutMs
    },
    features: config.features
  };
}
