export function createOpnsenseProvider(opnsenseClient) {
  return {
    async getOverview() {
      const [wan, vpn, system] = await Promise.all([
        this.getWanStatus(),
        this.getVpnOnline(),
        this.getSystemHealth()
      ]);

      return {
        timestamp: Math.floor(Date.now() / 1000),
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
      // 第一阶段先返回占位结构，下一步再映射真实 OPNsense endpoint
      return {
        online: true,
        latencyMs: null,
        packetLossPct: null,
        statusText: 'connected'
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
      const probe = await opnsenseClient.probe();
      return {
        cpuPct: null,
        memoryPct: null,
        diskPct: null,
        status: probe ? 'reachable' : 'unknown'
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
