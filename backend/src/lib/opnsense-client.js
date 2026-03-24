import { HttpError } from './http-error.js';

function buildAuthHeader(apiKey, apiSecret) {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function createOpnsenseClient(config) {
  const { baseUrl, apiKey, apiSecret, verifyTls, timeoutMs } = config.opnsense;

  async function request(method, path, body) {
    if (!baseUrl || !apiKey || !apiSecret) {
      throw new HttpError(500, 'OPNsense API 配置不完整');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': buildAuthHeader(apiKey, apiSecret),
          'Accept': 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        dispatcher: undefined
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new HttpError(response.status, `OPNsense API 请求失败: ${response.status}`, data);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new HttpError(504, 'OPNsense API 请求超时');
      }
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(502, '无法连接 OPNsense API', {
        message: error.message,
        verifyTls
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    async probe() {
      return request('GET', '/api/core/system/status');
    },
    async getSystemStatus() {
      return request('GET', '/api/core/system/status');
    },
    async getGatewayStatus() {
      return request('GET', '/api/routes/gateway/status');
    }
  };
}
