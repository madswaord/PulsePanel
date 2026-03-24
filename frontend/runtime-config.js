(function () {
  const host = window.location.hostname || '127.0.0.1';
  const protocol = window.location.protocol || 'http:';
  const explicitApiBaseUrl = window.PULSEPANEL_API_BASE_URL || '';
  const sameOriginApiBaseUrl = '/api';
  const defaultApiBaseUrl = `${protocol}//${host}:8710/api`;
  const apiBaseUrl = explicitApiBaseUrl || (window.location.port === '8711' ? defaultApiBaseUrl : sameOriginApiBaseUrl);

  window.PULSEPANEL_CONFIG = {
    apiBaseUrl,
    brandName: 'PulsePanel',
    brandSubtitle: 'OPNsense 实时态势面板 · 新潮科技风网络控制台'
  };
})();
