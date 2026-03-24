import { HttpError } from './http-error.js';

export function createSmartDnsClient(config) {
  const baseUrl = (config.smartdns?.baseUrl || '').replace(/\/$/, '');
  const username = config.smartdns?.username || '';
  const password = config.smartdns?.password || '';
  const timeoutMs = config.smartdns?.timeoutMs || 5000;

  let token = null;
  let tokenExpiresAt = 0;

  async function login() {
    if (!baseUrl || !username || !password) {
      throw new HttpError(500, 'SmartDNS 配置不完整');
    }

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new HttpError(res.status, 'SmartDNS 登录失败', data);
    }

    token = `${data.token_type} ${data.token}`;
    tokenExpiresAt = Date.now() + ((Number(data.expires_in || 0) - 30) * 1000);
    return token;
  }

  async function ensureToken() {
    if (token && Date.now() < tokenExpiresAt) return token;
    return login();
  }

  async function get(path) {
    const auth = await ensureToken();
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: auth },
      signal: AbortSignal.timeout(timeoutMs)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new HttpError(res.status, `SmartDNS API 请求失败: ${res.status}`, data);
    }
    return data;
  }

  return {
    getOverview: () => get('/api/stats/overview'),
    getTopClients: () => get('/api/stats/top/client'),
    getTopDomains: () => get('/api/stats/top/domain'),
    getDomainLogs: () => get('/api/domain?limit=20')
  };
}
