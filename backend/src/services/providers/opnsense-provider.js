function nowTs() {
  return Math.floor(Date.now() / 1000);
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
      return {
        cpuPct: null,
        memoryPct: null,
        diskPct: null,
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
