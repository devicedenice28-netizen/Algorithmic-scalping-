export type VpnProtocol = "WIREGUARD" | "OPENVPN" | "MT5_SOCKS5_PROXY" | "HTTP_GATEWAY";

export interface VpnLocation {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  datacenter: string;
  directPingMs: number;
  tunneledPingMs: number;
  serverIp: string;
  proxyPort: number;
  wireguardPort: number;
  openVpnPort: number;
  recommendedFor: string[];
  status: "ONLINE" | "OPTIMAL" | "CONGESTED";
  loadPercent: number;
}

export interface VpnTunnelState {
  isConnected: boolean;
  isConnecting: boolean;
  selectedLocationId: string;
  protocol: VpnProtocol;
  killSwitchEnabled: boolean;
  dnsLeakProtection: boolean;
  tunnelIp: string;
  connectedSince?: string;
  bytesSentMb: number;
  bytesReceivedMb: number;
  currentPingMs: number;
  directPingMs: number;
  jitterMs: number;
  mt5ProxyUser: string;
  mt5ProxyPass: string;
}
