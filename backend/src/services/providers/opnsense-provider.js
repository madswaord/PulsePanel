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

function formatBps(value) {
  if (value == null || Number.isNaN(value)) return '0 bps';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mbps`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)} Kbps`;
  return `${Math.round(value)} bps`;
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

function parseCpuStreamPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const matches = [...payload.matchAll(/data:\s*(\{[^\n]+\})/g)];
  if (matches.length === 0) return null;

  try {
    const last = JSON.parse(matches[matches.length - 1][1]);
    return pickNumber(last.total, last.user + last.sys + (last.intr || 0));
  } catch {
    return null;
  }
}

function parseMemoryPayload(payload) {
  const total = pickNumber(payload?.memory?.total, payload?.memory?.total_bytes);
  const used = pickNumber(payload?.memory?.used, payload?.memory?.used_bytes);
  if (total == null || used == null || total <= 0) return null;
  return Math.round((used / total) * 1000) / 10;
}

function parseDiskPayload(payload) {
  const devices = Array.isArray(payload?.devices) ? payload.devices : [];
  const root = devices.find((item) => item.mountpoint === '/') || devices[0];
  if (!root) return null;
  return pickNumber(root.used_pct, root.usedPct);
}

function parseWireguardPayload(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const peers = rows
    .filter((item) => item.type === 'peer')
    .map((item) => ({
      name: item.name || item.ifname || 'Unnamed peer',
      endpoint: item.endpoint || '(none)',
      status: item['peer-status'] || 'unknown',
      latestHandshakeAge: pickNumber(item['latest-handshake-age']),
      latestHandshakeAt: item['latest-handshake-epoch'] || null,
      transferRx: pickNumber(item['transfer-rx']) ?? 0,
      transferTx: pickNumber(item['transfer-tx']) ?? 0
    }));

  const onlinePeers = peers.filter((item) => item.status === 'online');

  return {
    totalOnline: onlinePeers.length,
    peers
  };
}

function parseFirewallStatesPayload(payload) {
  return {
    activeStates: pickNumber(payload?.current) ?? 0,
    limit: pickNumber(payload?.limit)
  };
}

function parseGatewayStatusPayload(payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return {
      online: false,
      latencyMs: null,
      packetLossPct: null,
      statusText: 'unreachable',
      gatewayName: null,
      gatewayAddress: null,
      monitorIp: null
    };
  }

  const primary = payload.items.find((item) => item.name === 'WAN_GW') || payload.items[0];

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
    statusText,
    gatewayName: primary.name || null,
    gatewayAddress: primary.address || null,
    monitorIp: primary.monitor || null
  };
}

function normalizeWanInterface(item, fallbackIpv6 = null) {
  const stats = item.statistics || {};
  const rawIpv6 = (item.addr6 || '').split('/')[0] || null;
  const ipv6 = rawIpv6 && !rawIpv6.startsWith('fe80:') ? rawIpv6 : fallbackIpv6;
  return {
    name: item.description || item.identifier || item.device || 'WAN',
    interface: item.identifier || null,
    device: item.device || null,
    ipv4: (item.addr4 || '').split('/')[0] || null,
    ipv6,
    gateways: Array.isArray(item.gateways) ? item.gateways : [],
    rxBytes: pickNumber(stats['bytes received'], stats.bytesReceived, stats.rxbytes),
    txBytes: pickNumber(stats['bytes transmitted'], stats.bytesTransmitted, stats.txbytes),
    status: item.status || 'unknown'
  };
}

function parseInterfacesPayload(payload) {
  const rows = Array.isArray(payload) ? payload : [];
  const lan = rows.find((item) => item.identifier === 'lan' || item.description === 'LAN');
  const lanIpv6 = (lan?.addr6 || '').split('/')[0] || null;
  const wanCandidates = rows.filter((item) => item && (
    item.identifier === 'wan'
    || String(item.description || '').toUpperCase().includes('WAN')
    || String(item.device || '').startsWith('pppoe')
  ));

  const wans = wanCandidates.map((item) => normalizeWanInterface(item, item.identifier === 'wan' ? lanIpv6 : null));
  const primary = wans[0] || null;

  return {
    primary,
    wans,
    lanIpv6
  };
}

function parseArpPayload(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const clients = rows
    .filter((item) => item && !item.expired && !item.permanent)
    .filter((item) => item.ip && item.mac)
    .map((item) => ({
      hostname: item.hostname || item.manufacturer || item.ip,
      ip: item.ip,
      mac: item.mac,
      interface: item.intf_description || item.intf || 'unknown',
      vendor: item.manufacturer || '',
      lastSeen: nowTs() - Math.max(0, Math.min(1200, pickNumber(item.expires) ?? 0))
    }));

  clients.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  return clients;
}

function parseServicesPayload(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const priority = [
    'pf',
    'dnsmasq',
    'dhcpd',
    'webgui',
    'configd',
    'caddy',
    'cron'
  ];
  const rank = new Map(priority.map((id, idx) => [id, idx]));

  const services = rows
    .filter((item) => priority.includes(item.id))
    .map((item) => ({
      id: item.id,
      name: item.description || item.name || item.id,
      running: item.running === 1 || item.running === true
    }))
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));

  return services;
}

export function createOpnsenseProvider(opnsenseClient, logger, deviceIdentityStore) {
  const wanSamples = [];
  const firewallSamples = [];

  function pushWanSample(sample) {
    if (!sample) return;
    const last = wanSamples[wanSamples.length - 1];
    if (last && last.ts === sample.ts) {
      wanSamples[wanSamples.length - 1] = sample;
      return;
    }
    wanSamples.push(sample);
    while (wanSamples.length > 720) wanSamples.shift();
  }

  function pushFirewallSample(sample) {
    if (!sample) return;
    const last = firewallSamples[firewallSamples.length - 1];
    if (last && last.ts === sample.ts) {
      firewallSamples[firewallSamples.length - 1] = sample;
      return;
    }
    firewallSamples.push(sample);
    while (firewallSamples.length > 720) firewallSamples.shift();
  }

  function buildWanRate(sample) {
    if (!sample) {
      return {
        downloadBps: 0,
        uploadBps: 0,
        downloadHuman: '0 bps',
        uploadHuman: '0 bps'
      };
    }

    const prev = wanSamples[wanSamples.length - 2];
    if (!prev) {
      return {
        downloadBps: 0,
        uploadBps: 0,
        downloadHuman: '0 bps',
        uploadHuman: '0 bps'
      };
    }

    const dt = sample.ts - prev.ts;
    const rxDiff = sample.rxBytes - prev.rxBytes;
    const txDiff = sample.txBytes - prev.txBytes;

    const downloadBps = dt > 0 && rxDiff >= 0 ? (rxDiff * 8) / dt : 0;
    const uploadBps = dt > 0 && txDiff >= 0 ? (txDiff * 8) / dt : 0;

    return {
      downloadBps,
      uploadBps,
      downloadHuman: formatBps(downloadBps),
      uploadHuman: formatBps(uploadBps)
    };
  }

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

  async function safeSystemResources() {
    try {
      const data = await opnsenseClient.getDiagnosticsSystemResources();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense system resources failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeSystemDisk() {
    try {
      const data = await opnsenseClient.getDiagnosticsSystemDisk();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense system disk failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeCpuStream() {
    try {
      const data = await opnsenseClient.getDiagnosticsCpuStream();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense cpu stream failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeWireguard() {
    try {
      const data = await opnsenseClient.getWireguardShow();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense wireguard status failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeFirewallStates() {
    try {
      const data = await opnsenseClient.getFirewallPfStates();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense firewall states failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeInterfacesOverview() {
    try {
      const data = await opnsenseClient.getInterfacesOverview();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense interfaces overview failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeArpSearch() {
    try {
      const data = await opnsenseClient.searchArp();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense arp search failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function safeServiceSearch() {
    try {
      const data = await opnsenseClient.searchServices();
      return { ok: true, data };
    } catch (error) {
      logger.warn('OPNsense service search failed', {
        message: error.message,
        details: error.details || null
      });
      return { ok: false, error };
    }
  }

  async function collectWanSample() {
    const interfaces = await safeInterfacesOverview();
    if (!interfaces.ok) return null;

    const parsed = parseInterfacesPayload(interfaces.data);
    const primary = parsed?.primary;
    if (!primary) return null;

    const sample = {
      ts: nowTs(),
      rxBytes: primary.rxBytes ?? 0,
      txBytes: primary.txBytes ?? 0,
      name: primary.name,
      interface: primary.interface,
      device: primary.device,
      ipv4: primary.ipv4,
      ipv6: primary.ipv6,
      gateways: primary.gateways,
      status: primary.status
    };
    pushWanSample(sample);
    return sample;
  }

  return {
    async getOverview() {
      const [wan, vpn, system, firewall, throughput] = await Promise.all([
        this.getWanStatus(),
        this.getVpnOnline(),
        this.getSystemHealth(),
        this.getFirewallStates(),
        this.getWanThroughput()
      ]);

      return {
        timestamp: nowTs(),
        wan,
        throughput,
        firewall: {
          activeStates: firewall.activeStates,
          blockedLastMinute: 0,
          limit: firewall.limit,
          pressurePct: firewall.pressurePct,
          status: firewall.status
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
      const [gateway, interfaces] = await Promise.all([
        safeGatewayStatus(),
        safeInterfacesOverview()
      ]);
      const parsedGateway = gateway.ok ? parseGatewayStatusPayload(gateway.data) : null;
      const parsedInterface = interfaces.ok ? parseInterfacesPayload(interfaces.data) : null;
      const primary = parsedInterface?.primary;

      if (parsedGateway || primary) {
        return {
          online: parsedGateway ? parsedGateway.online : primary?.status === 'up',
          latencyMs: parsedGateway?.latencyMs ?? null,
          packetLossPct: parsedGateway?.packetLossPct ?? null,
          statusText: parsedGateway?.statusText || primary?.status || 'reachable',
          gatewayName: parsedGateway?.gatewayName ?? null,
          gatewayAddress: parsedGateway?.gatewayAddress ?? primary?.gateways?.[0] ?? null,
          monitorIp: parsedGateway?.monitorIp ?? null,
          interfaceName: primary?.name ?? null,
          interfaceId: primary?.interface ?? null,
          device: primary?.device ?? null,
          publicIp: primary?.ipv4 ?? null,
          publicIpv6: primary?.ipv6 ?? null,
          wans: parsedInterface?.wans || []
        };
      }

      const probe = await safeProbe();
      return {
        online: probe.reachable,
        latencyMs: null,
        packetLossPct: null,
        statusText: probe.reachable ? 'reachable' : 'unreachable',
        gatewayName: null,
        gatewayAddress: null,
        monitorIp: null,
        interfaceName: null,
        interfaceId: null,
        device: null,
        publicIp: null,
        publicIpv6: null,
        wans: []
      };
    },

    async getVpnOnline() {
      const wireguard = await safeWireguard();
      const wg = wireguard.ok ? parseWireguardPayload(wireguard.data) : { totalOnline: 0, peers: [] };

      return {
        totalOnline: wg.totalOnline,
        providers: {
          wireguard: wg.totalOnline,
          openvpn: 0
        },
        peers: wg.peers
      };
    },

    async getSystemHealth() {
      const [systemStatus, resources, disk, cpu, services] = await Promise.all([
        safeSystemStatus(),
        safeSystemResources(),
        safeSystemDisk(),
        safeCpuStream(),
        safeServiceSearch()
      ]);

      if (systemStatus.ok) {
        const parsed = parseSystemStatusPayload(systemStatus.data);
        const cpuPct = cpu.ok ? parseCpuStreamPayload(cpu.data) : parsed.cpuPct;
        const memoryPct = resources.ok ? parseMemoryPayload(resources.data) : parsed.memoryPct;
        const diskPct = disk.ok ? parseDiskPayload(disk.data) : parsed.diskPct;
        const serviceList = services.ok ? parseServicesPayload(services.data) : [];
        const stoppedServices = serviceList.filter((item) => !item.running);
        const summaryStatus = stoppedServices.length > 0
          ? 'degraded'
          : [cpuPct, memoryPct, diskPct].some((value) => value != null && value >= 85)
            ? 'elevated'
            : 'healthy';
        const summaryText = stoppedServices.length > 0
          ? `关键服务异常 ${stoppedServices.length} 个`
          : summaryStatus === 'elevated'
            ? '资源占用偏高'
            : '运行正常';

        return {
          cpuPct,
          memoryPct,
          diskPct,
          status: parsed.rawReachable ? 'reachable' : 'unknown',
          statusText: parsed.statusText,
          message: parsed.message,
          metricsSource: [
            cpu.ok ? 'cpu_stream' : null,
            resources.ok ? 'system_resources' : null,
            disk.ok ? 'system_disk' : null
          ].filter(Boolean).join('+') || 'system_status_basic',
          services: serviceList,
          summaryStatus,
          summaryText,
          stoppedServices: stoppedServices.map((item) => item.id)
        };
      }

      const probe = await safeProbe();
      const parsed = parseSystemStatusPayload(probe.data);
      const serviceList = services.ok ? parseServicesPayload(services.data) : [];
      return {
        cpuPct: null,
        memoryPct: null,
        diskPct: null,
        status: probe.reachable ? 'reachable' : 'unreachable',
        statusText: parsed.statusText,
        message: parsed.message,
        metricsSource: 'probe_fallback',
        services: serviceList,
        summaryStatus: probe.reachable ? 'degraded' : 'offline',
        summaryText: probe.reachable ? '已接入，但仅有基础探测结果' : 'OPNsense 不可达',
        stoppedServices: serviceList.filter((item) => !item.running).map((item) => item.id)
      };
    },

    async getWanThroughput() {
      const sample = await collectWanSample();
      return buildWanRate(sample);
    },

    async getWanTimeseries(range = '10m') {
      await collectWanSample();
      const now = nowTs();
      const rangeSeconds = range === '1h' ? 3600 : range === '30m' ? 1800 : 600;
      const filtered = wanSamples.filter((sample) => sample.ts >= now - rangeSeconds);
      const points = filtered.map((sample, idx, arr) => {
        if (idx === 0) return { ts: sample.ts, rx: 0, tx: 0 };
        const prev = arr[idx - 1];
        const dt = sample.ts - prev.ts;
        const rx = dt > 0 ? Math.max(0, ((sample.rxBytes - prev.rxBytes) * 8) / dt) : 0;
        const tx = dt > 0 ? Math.max(0, ((sample.txBytes - prev.txBytes) * 8) / dt) : 0;
        return { ts: sample.ts, rx, tx };
      });
      return { range, points };
    },

    async getClientsOnline() {
      const arp = await safeArpSearch();
      const rawClients = arp.ok ? parseArpPayload(arp.data) : [];
      if (deviceIdentityStore) {
        deviceIdentityStore.updateFromClients(rawClients);
      }
      const clients = deviceIdentityStore ? deviceIdentityStore.enrichClients(rawClients) : rawClients;
      const groups = clients.reduce((acc, client) => {
        const key = client.interface || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return {
        totalOnline: clients.length,
        groups,
        clients: clients.slice(0, 20)
      };
    },

    async getFirewallStates(range = '10m') {
      const states = await safeFirewallStates();
      const parsed = states.ok ? parseFirewallStatesPayload(states.data) : { activeStates: 0 };
      const now = nowTs();
      pushFirewallSample({ ts: now, value: parsed.activeStates });
      const rangeSeconds = range === '1h' ? 3600 : range === '30m' ? 1800 : 600;
      const trend = firewallSamples.filter((item) => item.ts >= now - rangeSeconds);
      const limit = parsed.limit ?? 0;
      const pressurePct = limit > 0 ? Math.round((parsed.activeStates / limit) * 1000) / 10 : null;
      const status = pressurePct == null ? 'unknown' : pressurePct >= 85 ? 'high' : pressurePct >= 60 ? 'elevated' : 'normal';
      return {
        activeStates: parsed.activeStates,
        limit,
        pressurePct,
        status,
        range,
        trend: trend.length ? trend : [{ ts: now, value: parsed.activeStates }]
      };
    }
  };
}
