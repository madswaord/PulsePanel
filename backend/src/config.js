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
  return {
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
}

export function validateConfig(config) {
  const warnings = [];
  const errors = [];

  if (!config.app.port || Number.isNaN(config.app.port)) {
    errors.push('PORT 必须是有效数字');
  }

  if (config.opnsense.baseUrl && !/^https?:\/\//i.test(config.opnsense.baseUrl)) {
    errors.push('OPNSENSE_BASE_URL 必须包含 http:// 或 https://');
  }

  const hasAnyOpnsenseConfig = Boolean(
    config.opnsense.baseUrl || config.opnsense.apiKey || config.opnsense.apiSecret
  );

  const hasFullOpnsenseConfig = Boolean(
    config.opnsense.baseUrl && config.opnsense.apiKey && config.opnsense.apiSecret
  );

  if (hasAnyOpnsenseConfig && !hasFullOpnsenseConfig) {
    warnings.push('OPNsense 配置不完整，系统将回退到 Mock 模式');
  }

  if (config.opnsense.baseUrl && !config.opnsense.verifyTls) {
    warnings.push('VERIFY_TLS 当前为关闭，适合内网/自签名调试，不建议公网长期关闭');
  }

  if (!['core', 'netdata', 'vnstat', 'ntopng'].includes(config.features.trafficProvider)) {
    warnings.push(`未知的 TRAFFIC_PROVIDER=${config.features.trafficProvider}，将按 core 思路处理`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hasFullOpnsenseConfig
  };
}

export function getConfigSummary(config) {
  const validation = validateConfig(config);
  return {
    app: config.app,
    opnsense: {
      baseUrl: config.opnsense.baseUrl,
      configured: validation.hasFullOpnsenseConfig,
      verifyTls: config.opnsense.verifyTls,
      timeoutMs: config.opnsense.timeoutMs
    },
    features: config.features,
    validation
  };
}
