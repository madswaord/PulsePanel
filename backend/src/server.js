import express from 'express';
import cors from 'cors';
import { loadConfig, getConfigSummary } from './config.js';
import { createOpnsenseClient } from './lib/opnsense-client.js';
import { HttpError } from './lib/http-error.js';
import { createDashboardService } from './services/dashboard-service.js';

const config = loadConfig();
const app = express();
const port = config.app.port;
const opnsenseClient = createOpnsenseClient(config);
const dashboardService = createDashboardService({ config, opnsenseClient });

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'pulsepanel-backend',
    timestamp: nowTs(),
    config: getConfigSummary(config),
    mode: dashboardService.mode
  });
});

app.get('/api/capabilities', (_req, res) => {
  res.json({
    timestamp: nowTs(),
    mode: dashboardService.mode,
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

app.get('/api/dashboard/overview', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getOverview());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/wan/status', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getWanStatus());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/wan/throughput', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getWanThroughput());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/wan/timeseries', async (req, res, next) => {
  try {
    res.json(await dashboardService.getWanTimeseries(req.query.range || '5m'));
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/clients/online', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getClientsOnline());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/vpn/online', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getVpnOnline());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/firewall/states', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getFirewallStates());
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/system/health', async (_req, res, next) => {
  try {
    res.json(await dashboardService.getSystemHealth());
  } catch (error) {
    next(error);
  }
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
