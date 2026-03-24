function nowTs() {
  return Math.floor(Date.now() / 1000);
}

export function createMockProvider() {
  return {
    async getOverview() {
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
    },

    async getWanStatus() {
      return {
        online: true,
        latencyMs: 18,
        packetLossPct: 0,
        statusText: 'healthy'
      };
    },

    async getVpnOnline() {
      return {
        totalOnline: 6,
        providers: {
          wireguard: 4,
          openvpn: 2
        }
      };
    },

    async getSystemHealth() {
      return {
        cpuPct: 21,
        memoryPct: 48,
        diskPct: 37,
        status: 'normal'
      };
    },

    async getWanThroughput() {
      return {
        downloadBps: 23849213,
        uploadBps: 3289123,
        downloadHuman: '22.7 Mbps',
        uploadHuman: '3.1 Mbps'
      };
    },

    async getWanTimeseries(range = '5m') {
      const end = nowTs();
      return {
        range,
        points: Array.from({ length: 30 }).map((_, idx) => ({
          ts: end - (29 - idx) * 2,
          rx: 18000000 + Math.round(Math.random() * 9000000),
          tx: 2000000 + Math.round(Math.random() * 3000000)
        }))
      };
    },

    async getClientsOnline() {
      return {
        totalOnline: 23,
        clients: [
          { hostname: 'MacBook-Pro', ip: '192.168.10.23', mac: 'AA:BB:CC:DD:EE:01', online: true, lastSeen: nowTs() - 8 },
          { hostname: 'iPhone', ip: '192.168.10.31', mac: 'AA:BB:CC:DD:EE:02', online: true, lastSeen: nowTs() - 5 },
          { hostname: 'NAS', ip: '192.168.10.8', mac: 'AA:BB:CC:DD:EE:03', online: true, lastSeen: nowTs() - 2 }
        ]
      };
    },

    async getFirewallStates() {
      const end = nowTs();
      return {
        activeStates: 18432,
        trend: Array.from({ length: 20 }).map((_, idx) => ({ ts: end - (19 - idx) * 3, value: 18000 + Math.round(Math.random() * 900) }))
      };
    }
  };
}
