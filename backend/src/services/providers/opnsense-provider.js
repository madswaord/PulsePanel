function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.\-]/g, '');
      if (cleaned && !Number.isNaN(Number(cleaned))) return Number(cleaned);
    }
  }
  return null;
}

function parseSystemStatusPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      cpuPct: null,
      memoryPct: null,
      diskPct: null,
      rawReachable: false,
      statusText: 'unknown',
      message: 'No payload'
    };
  }

  const statusCode = payload.metadata?.system?.status ?? null;
  const statusMessage = payload.metadata?.system?.message ?? 'System status available';

  return {
    cpuPct: null,
    memoryPct: null,
    diskPct: null,
    rawReachable: true,
    statusText: statusCode === 2 ? 'online' : 'reachable',
    message: statusMessage
  };
}

function parseGatewayStatusPayload(payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return {
      online: false,
      latencyMs: null,
      packetLossPct: null,
      statusText: 'unreachable'
    };
  }

  const primary = payload.items.find(item => item.name === 'WAN_GW') || payload.items[0];

  const latencyMs = pickNumber(
    primary.delay,
    primary.latency,
    primary.average,
    primary.avg,
    primary.rtt
  );

  const packetLossPct = pickNumber(
    primary.loss,
    primary.packetloss,
    primary.packetLoss,
    primary.lossPct
  );

  const translated = primary.status_translated || '';
  const statusText = translated ? translated.toLowerCase() : (primary.status || 'reachable');

  return {
    online: translated === 'Online' || primary.status === 'none' || primary.status === 'online',
    latencyMs,
    packetLossPct,
    statusText
  };
}

export function createOpnsenseProvider(opnsenseClient, logger) {
  async function safeProbe() {
    try {
      const data = await opnsenseClient.probe();
      return { reachable: true, data };
    } catch (error) {
      logger.warn('OPNsense probe failed, provider will return fallback data', {
        message: error.message,
        details: error.details || null
      });
      return { reachable: false, data: null, error };
    }
  }

  async function safeSystemStatus() {
    try {
      const data = await opnsenseClient.getSystemStatus();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense system status failed, fallback to probe', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeGatewayStatus() {
    try {
      const data = await opnsenseClient.getGatewayStatus();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense gateway status failed, fallback to probe', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  return {
    async getOverview() {
      const [wan, vpn, system] = await Promise.all([
        this.getWanStatus(),
        this.getVpnOnline(),
        this.getSystemHealth()
      ]);

      return {
        timestamp: nowTs(),
        wan,
        throughput: {
          downloadBps: 0,
          uploadBps: 0,
          downloadHuman: '0 bps',
          uploadHuman: '0 bps'
        },
        firewall: {
          activeStates: 0,
          blockedLastMinute: 0
        },
        vpn,
        dns: {
          qps: 0,
          status: 'unknown'
        },
        system
      };
    },

    async getWanStatus() {
      const gateway = await safeGatewayStatus();
      if (gateway.ok) {
        return parseGatewayStatusPayload(gateway.data);
      }

      const probe = await safeProbe();
      return {
        online: probe.reachable,
        latencyMs: null,
        packetLossPct: null,
        statusText: probe.reachable ? 'reachable' : 'unreachable'
      };
    },

    async getVpnOnline() {
      return {
        totalOnline: 0,
        providers: {
          wireguard: 0,
          openvpn: 0
        }
      };
    },

    async getSystemHealth() {
      const systemStatus = await safeSystemStatus();
      if (systemStatus.ok) {
        const parsed = parseSystemStatusPayload(systemStatus.data);
        return {
          cpuPct: parsed.cpuPct,
          memoryPct: parsed.memoryPct,
          diskPct: parsed.diskPct,
          status: parsed.rawReachable ? 'reachable' : 'unknown',
          statusText: parsed.statusText,
          message: parsed.message,
          metricsSource: 'system_status_basic'
        };
      }

      const probe = await safeProbe();
      const parsed = parseSystemStatusPayload(probe.data);
      return {
        cpuPct: parsed.cpuPct,
        memoryPct: parsed.memoryPct,
        diskPct: parsed.diskPct,
        status: probe.reachable ? 'reachable' : 'unreachable',
        statusText: parsed.statusText,
        message: parsed.message,
        metricsSource: 'probe_fallback'
      };
    },

    async getWanThroughput() {
      return {
        downloadBps: 0,
        uploadBps: 0,
        downloadHuman: '0 bps',
        uploadHuman: '0 bps'
      };
    },

    async getWanTimeseries(range = '5m') {
      return { range, points: [] };
    },

    async getClientsOnline() {
      return {
        totalOnline: 0,
        clients: []
      };
    },

    async getFirewallStates() {
      return {
        activeStates: 0,
        trend: []
      };
    }
  };
}
