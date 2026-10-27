import { VpnLocation, VpnProtocol, VpnTunnelState } from "../types/vpn";

export const VPN_LOCATIONS: VpnLocation[] = [
  {
    id: "ld4-london",
    name: "London LD4 (Equinix Slough)",
    city: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    datacenter: "Equinix LD4.2 Core Financial Exchange",
    directPingMs: 78,
    tunneledPingMs: 9,
    serverIp: "185.193.124.42",
    proxyPort: 1080,
    wireguardPort: 51820,
    openVpnPort: 1194,
    recommendedFor: ["Exness (LD4)", "IC Markets (LD4)", "Tickmill", "Pepperstone"],
    status: "OPTIMAL",
    loadPercent: 24,
  },
  {
    id: "ny4-newyork",
    name: "New York NY4 (Equinix Secaucus)",
    city: "New York",
    country: "United States",
    flag: "🇺🇸",
    datacenter: "Equinix NY4 Tier-IV Institutional Hub",
    directPingMs: 92,
    tunneledPingMs: 12,
    serverIp: "198.51.100.77",
    proxyPort: 1080,
    wireguardPort: 51820,
    openVpnPort: 1194,
    recommendedFor: ["OANDA NY4", "FTMO USA", "Forex.com", "IG Group US"],
    status: "OPTIMAL",
    loadPercent: 31,
  },
  {
    id: "fra-frankfurt",
    name: "Frankfurt FR2 (Equinix Kleyer)",
    city: "Frankfurt",
    country: "Germany",
    flag: "🇩🇪",
    datacenter: "Equinix FR2 Continental ECN Gateway",
    directPingMs: 84,
    tunneledPingMs: 13,
    serverIp: "194.109.6.18",
    proxyPort: 1080,
    wireguardPort: 51820,
    openVpnPort: 1194,
    recommendedFor: ["XM Global", "RoboForex", "Admirals", "Interactive Brokers EU"],
    status: "ONLINE",
    loadPercent: 39,
  },
  {
    id: "ty3-tokyo",
    name: "Tokyo TY3 (Equinix Otemachi)",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    datacenter: "Equinix TY3 Asia-Pac Financial Hub",
    directPingMs: 145,
    tunneledPingMs: 19,
    serverIp: "203.0.113.88",
    proxyPort: 1080,
    wireguardPort: 51820,
    openVpnPort: 1194,
    recommendedFor: ["Rakuten Securities", "GMO Click", "JPY Asian Cross Liquidity"],
    status: "OPTIMAL",
    loadPercent: 18,
  },
  {
    id: "sg1-singapore",
    name: "Singapore SG1 (Equinix Jurong)",
    city: "Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    datacenter: "Equinix SG1 ASEAN Gateway",
    directPingMs: 132,
    tunneledPingMs: 22,
    serverIp: "103.28.248.91",
    proxyPort: 1080,
    wireguardPort: 51820,
    openVpnPort: 1194,
    recommendedFor: ["Vantage FX", "AxiTrader SG", "FP Markets ASEAN"],
    status: "ONLINE",
    loadPercent: 28,
  },
];

export const INITIAL_VPN_STATE: VpnTunnelState = {
  isConnected: true, // Default connected for low latency MT5 linkage
  isConnecting: false,
  selectedLocationId: "ld4-london",
  protocol: "MT5_SOCKS5_PROXY",
  killSwitchEnabled: true,
  dnsLeakProtection: true,
  tunnelIp: "185.193.124.42",
  connectedSince: new Date(Date.now() - 3600 * 1000 * 2.5).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  bytesSentMb: 142.6,
  bytesReceivedMb: 618.3,
  currentPingMs: 9.2,
  directPingMs: 78.0,
  jitterMs: 0.8,
  mt5ProxyUser: "trader_ea_pro",
  mt5ProxyPass: "mql5_fast_tunnel_2026",
};

/**
 * Generate WireGuard wg0-mt5.conf configuration
 */
export function generateWireguardConfig(loc: VpnLocation): string {
  return `[Interface]
# SpeakingHand AI AlgoPro - Ultra Low Latency MT5 Dedicated Tunnel
PrivateKey = yAn7G9s8P+Q2xK1v4Mt5AlGoProClientKeySecretSample=
Address = 10.66.0.2/32, fd42:42:42::2/128
DNS = 1.1.1.1, 8.8.8.8
MTU = 1420

[Peer]
# Datacenter: ${loc.datacenter} (${loc.name})
# Target Broker Node: ${loc.recommendedFor.join(", ")}
PublicKey = Mt5ServerKeyLD4SloughEquinixBrokerGateway2026=
Endpoint = ${loc.serverIp}:${loc.wireguardPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 15
`;
}

/**
 * Generate OpenVPN mt5-tunnel.ovpn configuration
 */
export function generateOpenVpnConfig(loc: VpnLocation): string {
  return `client
dev tun
proto udp
remote ${loc.serverIp} ${loc.openVpnPort}
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
fast-io
sndbuf 524288
rcvbuf 524288

# Optimized for MetaTrader 5 High-Frequency WebRequests
comp-lzo no
verb 3

<ca>
-----BEGIN CERTIFICATE-----
MIIBtzCCAS2gAwIBAgIUAlgOPRO_MT5_LOW_LATENCY_EQUINIX_GATEWAY_CA...
-----END CERTIFICATE-----
</ca>
`;
}

/**
 * Generate MQL5 Proxy setting snippet for WebRequest/Sockets
 */
export function generateMql5ProxyCode(loc: VpnLocation): string {
  return `//+------------------------------------------------------------------+
//| MetaTrader 5 WebRequest & Proxy Tunnel Configuration            |
//| Datacenter: ${loc.name}                                         |
//+------------------------------------------------------------------+
// In MetaTrader 5 Terminal:
// 1. Go to Tools -> Options -> Server
// 2. Check "Enable proxy server" -> Click "Proxy..."
// 3. Select Type: SOCKS5
// 4. Server: ${loc.serverIp}:${loc.proxyPort}
// 5. Login: trader_ea_pro  Password: mql5_fast_tunnel_2026
// 6. Test connection: Latency reduced from ${loc.directPingMs}ms to ${loc.tunneledPingMs}ms
`;
}
