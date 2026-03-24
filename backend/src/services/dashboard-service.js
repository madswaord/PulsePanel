import { createMockProvider } from './providers/mock-provider.js';
import { createOpnsenseProvider } from './providers/opnsense-provider.js';

function isOpnsenseConfigured(config) {
  return Boolean(
    config.opnsense.baseUrl &&
    config.opnsense.apiKey &&
    config.opnsense.apiSecret
  );
}

export function createDashboardService({ config, opnsenseClient, logger, deviceIdentityStore }) {
  const mode = isOpnsenseConfigured(config) ? 'opnsense' : 'mock';
  const provider = mode === 'opnsense'
    ? createOpnsenseProvider(opnsenseClient, logger, deviceIdentityStore)
    : createMockProvider();

  logger.info('Dashboard service initialized', {
    mode,
    baseUrl: config.opnsense.baseUrl || null,
    trafficProvider: config.features.trafficProvider
  });

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
