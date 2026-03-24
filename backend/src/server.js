import express from 'express';
import cors from 'cors';
import { loadConfig, getConfigSummary } from './config.js';
import { createOpnsenseClient } from './lib/opnsense-client.js';
import { HttpError } from './lib/http-error.js';

const config = loadConfig();
const app = express();
const port = config.app.port;
const opnsenseClient = createOpnsenseClient(config);

app.use(cors());
app.use(express.json());

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function mockOverview() {
  return {
    timestamp: nowTs(),
    wan: {
      online: true,
      latencyMs: 18,
      packetLossPct: 0,
      statusText: 'healthy'
    },
    throughput: {
      downloadBps: 23849213,
      uploadBps: 3289123,
      downloadHuman: '22.7 Mbps',
      uploadHuman: '3.1 Mbps'
    },
    firewall: {
      activeStates: 18432,
      blockedLastMinute: 37
    },
    vpn: {
      totalOnline: 6,
      providers: {
        wireguard: 4,
        openvpn: 2
      }
    },
    dns: {
      qps: 43,
      status: 'normal'
    },
    system: {
      cpuPct: 21,
      memoryPct: 48,
      diskPct: 37,
      status: 'normal'
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'pulsepanel-backend',
    timestamp: nowTs(),
    config: getConfigSummary(config)
  });
});

app.get('/api/capabilities', (_req, res) => {
  res.json({
    timestamp: nowTs(),
    mode: config.opnsense.baseUrl ? 'configured' : 'mock',
    features: {
      wan: true,
      vpn: true,
      firewall: true,
      dns: true,
      caddyAccess: config.features.enableCaddyLogs,
      topTalkers: false,
      dnsStream: config.features.enableDnsLogs
    },
    providers: {
      traffic: config.features.trafficProvider
    }
  });
});

app.get('/api/opnsense/probe', async (_req, res, next) => {
  try {
    const data = await opnsenseClient.probe();
    res.json({ ok: true, timestamp: nowTs(), data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/overview', (_req, res) => {
  res.json(mockOverview());
});

app.get('/api/dashboard/wan/status', (_req, res) => {
  res.json(mockOverview().wan);
});

app.get('/api/dashboard/wan/throughput', (_req, res) => {
  res.json(mockOverview().throughput);
});

app.get('/api/dashboard/wan/timeseries', (req, res) => {
  const range = req.query.range || '5m';
  const end = nowTs();
  const points = Array.from({ length: 30 }).map((_, idx) => ({
    ts: end - (29 - idx) * 2,
    rx: 18000000 + Math.round(Math.random() * 9000000),
    tx: 2000000 + Math.round(Math.random() * 3000000)
  }));
  res.json({ range, points });
});

app.get('/api/dashboard/clients/online', (_req, res) => {
  res.json({
    totalOnline: 23,
    clients: [
      { hostname: 'MacBook-Pro', ip: '192.168.10.23', mac: 'AA:BB:CC:DD:EE:01', online: true, lastSeen: nowTs() - 8 },
      { hostname: 'iPhone', ip: '192.168.10.31', mac: 'AA:BB:CC:DD:EE:02', online: true, lastSeen: nowTs() - 5 },
      { hostname: 'NAS', ip: '192.168.10.8', mac: 'AA:BB:CC:DD:EE:03', online: true, lastSeen: nowTs() - 2 }
    ]
  });
});

app.get('/api/dashboard/vpn/online', (_req, res) => {
  res.json(mockOverview().vpn);
});

app.get('/api/dashboard/firewall/states', (_req, res) => {
  const end = nowTs();
  res.json({
    activeStates: 18432,
    trend: Array.from({ length: 20 }).map((_, idx) => ({ ts: end - (19 - idx) * 3, value: 18000 + Math.round(Math.random() * 900) }))
  });
});

app.get('/api/dashboard/system/health', (_req, res) => {
  res.json(mockOverview().system);
});

app.use((error, _req, res, _next) => {
  const status = error instanceof HttpError ? error.status : 500;
  res.status(status).json({
    ok: false,
    error: error.message || '未知错误',
    details: error.details || null,
    timestamp: nowTs()
  });
});

app.listen(port, () => {
  console.log(`PulsePanel backend listening on :${port}`);
});
