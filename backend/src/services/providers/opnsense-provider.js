function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function parseSystemStatusProbe(probe) {
  if (!probe || typeof probe !== 'object') {
    return {
      reachable: false,
      cpuPct: null,
      memoryPct: null,
      diskPct: null
    };
  }

  const lower = JSON.stringify(probe).toLowerCase();

  const cpuPct =
    probe.cpu ??
    probe.cpuPct ??
    probe.cpu_pct ??
    probe.system?.cpu ??
    probe.system?.cpuPct ??
    null;

  const memoryPct =
    probe.memory ??
    probe.memoryPct ??
    probe.memory_pct ??
    probe.mem ??
    probe.system?.memory ??
    probe.system?.memoryPct ??
    null;

  const diskPct =
    probe.disk ??
    probe.diskPct ??
    probe.disk_pct ??
    probe.storage ??
    probe.system?.disk ??
    probe.system?.diskPct ??
    null;

  return {
    reachable: !lower.includes('error'),
    cpuPct: typeof cpuPct === 'number' ? cpuPct : null,
    memoryPct: typeof memoryPct === 'number' ? memoryPct : null,
    diskPct: typeof diskPct === 'number' ? diskPct : null
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
      const probe = await safeProbe();
      const parsed = parseSystemStatusProbe(probe.data);
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
