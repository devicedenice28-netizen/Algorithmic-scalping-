export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export type BridgeType = "MT5_LOCAL_IPC" | "METAAPI_CLOUD" | "MT5_WEB_GATEWAY" | "BROKER_REST";

export interface BrokerPreset {
  id: string;
  name: string;
  server: string;
  type: "Demo" | "Real" | "Prop Firm";
  defaultLeverage: string;
  defaultCurrency: string;
  pingMs: number;
}

export interface MT5AccountCredentials {
  brokerName: string;
  server: string;
  login: string;
  password?: string;
  apiToken?: string;
  bridgeType: BridgeType;
  accountType: "Demo" | "Real" | "Prop Firm";
  leverage: string;
  currency: string;
  autoSyncBalance: boolean;
}

export interface LatencyPoint {
  time: string;
  timestamp: number;
  ping: number;
  jitter?: number;
}

export interface MT5ConnectionState {
  status: ConnectionStatus;
  credentials: MT5AccountCredentials;
  lastConnectedAt?: string;
  pingMs?: number;
  terminalVersion?: string;
  brokerCompany?: string;
  brokerServer?: string;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  errorMessage?: string;
  latencyHistory?: LatencyPoint[];
}
