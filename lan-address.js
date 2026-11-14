// Picks the laptop address phones should use when the server runs locally (no PUBLIC_URL).
// A laptop often has several: Wi-Fi, a VPN such as Tailscale (100.64.0.0/10), virtual adapters.
// Phones on the same Wi-Fi can only reach the private LAN address, so those come first:
// 192.168/16, then 10/8, then 172.16/12, then any other address, then carrier-grade NAT / VPN
// (100.64/10) and link-local (169.254/16) last.

function ipv4Parts(address) {
  const parts = String(address).split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}

// Lower is better.
function addressRank(address) {
  const p = ipv4Parts(address);
  if (!p) return 9;
  if (p[0] === 192 && p[1] === 168) return 0;
  if (p[0] === 10) return 1;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return 2;
  if (p[0] === 169 && p[1] === 254) return 5;
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return 4;
  return 3;
}

// `interfaces` has the shape of os.networkInterfaces(). Returns an IPv4 address or null.
function pickLanAddress(interfaces) {
  const candidates = [];
  for (const addresses of Object.values(interfaces || {})) {
    for (const address of addresses || []) {
      const isV4 = address.family === "IPv4" || address.family === 4;
      if (isV4 && !address.internal && ipv4Parts(address.address)) candidates.push(address.address);
    }
  }
  if (!candidates.length) return null;
  // Stable: equal ranks keep the operating system's order.
  return candidates.map((address, index) => ({ address, index, rank: addressRank(address) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)[0].address;
}

module.exports = { pickLanAddress, addressRank };
