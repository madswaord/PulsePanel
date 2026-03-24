import { createMockProvider } from './providers/mock-provider.js';
import { createOpnsenseProvider } from './providers/opnsense-provider.js';

function isOpnsenseConfigured(config) {
  return Boolean(
    config.opnsense.baseUrl &&
    config.opnsense.apiKey &&
    config.opnsense.apiSecret
  );
}

export function createDashboardService({ config, opnsenseClient }) {
  const mode = isOpnsenseConfigured(config) ? 'opnsense' : 'mock';
  const provider = mode === 'opnsense'
    ? createOpnsenseProvider(opnsenseClient)
    : createMockProvider();

  return {
    mode,
    getOverview: () => provider.getOverview(),
    getWanStatus: () => provider.getWanStatus(),
    getVpnOnline: () => provider.getVpnOnline(),
    getSystemHealth: () => provider.getSystemHealth(),
    getWanThroughput: () => provider.getWanThroughput(),
    getWanTimeseries: (range) => provider.getWanTimeseries(range),
    getClientsOnline: () => provider.getClientsOnline(),
    getFirewallStates: () => provider.getFirewallStates()
  };
}
