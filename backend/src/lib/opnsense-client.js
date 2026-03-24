import { HttpError } from './http-error.js';
import https from 'node:https';
import { URL } from 'node:url';

function buildAuthHeader(apiKey, apiSecret) {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function createOpnsenseClient(config) {
  const { baseUrl, apiKey, apiSecret, verifyTls, timeoutMs } = config.opnsense;

  function buildUrl(path) {
    return new URL(path.startsWith('/') ? path : `/${path}`, baseUrl);
  }

  function request(method, path, body) {
    if (!baseUrl || !apiKey || !apiSecret) {
      return Promise.reject(new HttpError(500, 'OPNsense API 配置不完整'));
    }

    const url = buildUrl(path);
    const payload = body ? JSON.stringify(body) : null;

    return new Promise((resolve, reject) => {
      const req = https.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        rejectUnauthorized: verifyTls,
        headers: {
          'Authorization': buildAuthHeader(apiKey, apiSecret),
          'Accept': 'application/json',
          ...(payload ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          } : {})
        },
        timeout: timeoutMs
      }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const data = parseBody(raw);
          if ((res.statusCode || 500) >= 400) {
            reject(new HttpError(res.statusCode || 500, `OPNsense API 请求失败: ${res.statusCode}`, data));
            return;
          }
          resolve(data);
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
      });

      req.on('error', (error) => {
        if (error.message === 'timeout') {
          reject(new HttpError(504, 'OPNsense API 请求超时'));
          return;
        }
        reject(new HttpError(502, '无法连接 OPNsense API', {
          message: error.message,
          verifyTls
        }));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  function requestSseSample(path) {
    if (!baseUrl || !apiKey || !apiSecret) {
      return Promise.reject(new HttpError(500, 'OPNsense API 配置不完整'));
    }

    const url = buildUrl(path);

    return new Promise((resolve, reject) => {
      let settled = false;
      let raw = '';

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      const req = https.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        rejectUnauthorized: verifyTls,
        headers: {
          'Authorization': buildAuthHeader(apiKey, apiSecret),
          'Accept': 'text/event-stream'
        },
        timeout: timeoutMs
      }, (res) => {
        if ((res.statusCode || 500) >= 400) {
          let errRaw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            errRaw += chunk;
          });
          res.on('end', () => {
            finish(reject, new HttpError(res.statusCode || 500, `OPNsense API 请求失败: ${res.statusCode}`, parseBody(errRaw)));
          });
          return;
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
          if (/data:\s*\{[^\n]+\}/.test(raw)) {
            req.destroy();
            finish(resolve, raw);
          }
        });

        res.on('end', () => {
          if (!settled) finish(resolve, raw);
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
      });

      req.on('error', (error) => {
        if (settled && error.message === 'socket hang up') return;
        if (settled) return;
        if (error.message === 'timeout') {
          finish(reject, new HttpError(504, 'OPNsense API 请求超时'));
          return;
        }
        finish(reject, new HttpError(502, '无法连接 OPNsense API', {
          message: error.message,
          verifyTls
        }));
      });

      req.end();
    });
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
    },
    async getDiagnosticsSystemResources() {
      return request('GET', '/api/diagnostics/system/system_resources');
    },
    async getDiagnosticsSystemMemory() {
      return request('GET', '/api/diagnostics/system/memory');
    },
    async getDiagnosticsSystemDisk() {
      return request('GET', '/api/diagnostics/system/system_disk');
    },
    async getDiagnosticsCpuStream() {
      return requestSseSample('/api/diagnostics/cpu_usage/stream');
    },
    async getWireguardShow() {
      return request('GET', '/api/wireguard/service/show');
    },
    async getFirewallPfStates() {
      return request('GET', '/api/diagnostics/firewall/pf_states');
    },
    async getInterfacesOverview() {
      return request('GET', '/api/interfaces/overview/export');
    }
  };
}
