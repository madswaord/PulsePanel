import fs from 'node:fs';
import path from 'node:path';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeMac(mac) {
  return String(mac || '').trim().toLowerCase();
}

export function createDeviceIdentityStore(projectRoot) {
  const dataDir = path.join(projectRoot, 'backend', 'data');
  const filePath = path.join(dataDir, 'devices.json');
  const aliasPath = path.join(dataDir, 'device-aliases.json');
  const aliasExamplePath = path.join(dataDir, 'device-aliases.example.json');
  ensureDir(dataDir);

  function load() {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return { devices: {} };
    }
  }

  function save(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  function loadAliases() {
    try {
      return JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
    } catch {
      return {};
    }
  }

  function updateFromClients(clients) {
    const db = load();
    const devices = db.devices || {};
    const aliasMap = loadAliases();

    for (const client of clients) {
      const mac = normalizeMac(client.mac);
      if (!mac) continue;
      const existing = devices[mac] || {
        mac,
        aliases: []
      };
      const manualAlias = aliasMap[mac] || null;
      const aliases = [manualAlias, ...(existing.aliases || [])].filter(Boolean);

      const displayName = aliases[0]
        || (client.hostname && client.hostname !== client.ip ? client.hostname : null)
        || existing.displayName
        || client.vendor
        || client.ip;

      devices[mac] = {
        ...existing,
        mac,
        ip: client.ip,
        interface: client.interface,
        vendor: client.vendor || existing.vendor || '',
        hostname: client.hostname || existing.hostname || '',
        displayName,
        aliases: Array.from(new Set(aliases)),
        lastSeen: client.lastSeen,
        updatedAt: Math.floor(Date.now() / 1000)
      };
    }

    db.devices = devices;
    save(db);
    return devices;
  }

  function enrichClients(clients) {
    const db = load();
    const devices = db.devices || {};
    return clients.map((client) => {
      const mac = normalizeMac(client.mac);
      const identity = devices[mac] || null;
      return {
        ...client,
        displayName: identity?.displayName || client.hostname || client.vendor || client.ip,
        aliases: identity?.aliases || []
      };
    });
  }

  return {
    filePath,
    aliasPath,
    aliasExamplePath,
    updateFromClients,
    enrichClients,
    load
  };
}
