function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return null;
}

function parseSystemStatusPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      cpuPct: null,
      memoryPct: null,
      diskPct: null,
      rawReachable: false
    };
  }

  const cpuPct = pickNumber(
    payload.cpu,
    payload.cpuPct,
    payload.cpu_pct,
    payload.system?.cpu,
    payload.system?.cpuPct,
    payload.status?.cpu
  );

  const memoryPct = pickNumber(
    payload.memory,
    payload.memoryPct,
    payload.memory_pct,
    payload.mem,
    payload.system?.memory,
    payload.system?.memoryPct,
    payload.status?.memory
  );

  const diskPct = pickNumber(
    payload.disk,
    payload.diskPct,
    payload.disk_pct,
    payload.storage,
    payload.system?.disk,
    payload.system?.diskPct,
    payload.status?.disk
  );

  return {
    cpuPct,
    memoryPct,
    diskPct,
    rawReachable: true
  };
}

function parseGatewayStatusPayload(payload) {
  if (!payload) {
    return {
      online: false,
      latencyMs: null,
      packetLossPct: null,
      statusText: 'unreachable'
    };
  }

  const latencyMs = pickNumber(
    payload.delay,
    payload.latency,
    payload.average,
    payload.avg,
    payload.rtt
  );

  const packetLossPct = pickNumber(
    payload.loss,
    payload.packetloss,
    payload.packetLoss,
    payload.lossPct
  );

  const statusText =
    payload.status ||
    payload.gateway_status ||
    (payload.online === true ? 'online' : 'reachable');

  return {
    online: true,
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
          status: parsed.rawReachable ? 'reachable' : 'unknown'
        };
      }

      const probe = await safeProbe();
      const parsed = parseSystemStatusPayload(probe.data);
      return {
        cpuPct: parsed.cpuPct,
        memoryPct: parsed.memoryPct,
        diskPct: parsed.diskPct,
        status: probe.reachable ? 'reachable' : 'unreachable'
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
