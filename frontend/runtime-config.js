(function () {
  const host = window.location.hostname || '127.0.0.1';
  const protocol = window.location.protocol || 'http:';
  const defaultApiBaseUrl = `${protocol}//${host}:8710/api`;

  window.PULSEPANEL_CONFIG = {
    apiBaseUrl: defaultApiBaseUrl,
    brandName: 'PulsePanel',
    brandSubtitle: 'OPNsense 实时态势面板 · 新潮科技风网络控制台'
  };
})();
