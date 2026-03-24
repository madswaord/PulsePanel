export function createLogger(scope = 'PulsePanel') {
  function format(level, message, meta) {
    const ts = new Date().toISOString();
    const parts = [`[${ts}]`, `[${scope}]`, `[${level}]`, message];
    if (meta !== undefined) {
      parts.push(typeof meta === 'string' ? meta : JSON.stringify(meta));
    }
    return parts.join(' ');
  }

  return {
    info(message, meta) {
      console.log(format('INFO', message, meta));
    },
    warn(message, meta) {
      console.warn(format('WARN', message, meta));
    },
    error(message, meta) {
      console.error(format('ERROR', message, meta));
    }
  };
}
