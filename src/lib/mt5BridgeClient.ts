import { MT5AccountCredentials, MT5ConnectionState } from "../types/broker";
import { Position, Trade } from "../types/trading";

export interface OrderBookEntry {
  price: number;
  volume: number;
  orders: number;
  totalVolume: number;
}

export interface Level2OrderBook {
  symbol: string;
  timestamp: number;
  spread: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface MT5LiveAccountState {
  login: string;
  server: string;
  brokerCompany: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  isReal: boolean;
  connectedAt: string;
  lastPing: number;
  openPositions: Array<{
    ticket: number;
    symbol: string;
    type: "BUY" | "SELL";
    lots: number;
    units: number;
    openPrice: number;
    currentPrice: number;
    sl: number;
    tp: number | null;
    profit: number;
    openTime: string;
    magic: number;
  }>;
  orderHistory: Array<{
    ticket: number;
    symbol: string;
    type: "BUY" | "SELL";
    lots: number;
    units: number;
    openPrice: number;
    closePrice: number;
    profit: number;
    openTime: string;
    closeTime: string;
    reason: string;
  }>;
}

type MessageHandler = (message: { type: string; data: any; account?: MT5LiveAccountState }) => void;

class MT5WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.isConnecting = true;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const url = `${protocol}//${host}/api/mt5/ws`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log("[MT5 WS Client] Connected to backend MT5 bridge socket.");
        // Request immediate account sync
        this.send("SYNC_ACCOUNT", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          for (const listener of this.listeners) {
            listener(parsed);
          }
        } catch (err) {
          console.error("[MT5 WS Client] Message parse error", err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("[MT5 WS Client] Connection error, retrying...", err);
        this.isConnected = false;
        this.isConnecting = false;
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public subscribe(handler: MessageHandler) {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public send(action: string, payload: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, payload }));
    }
  }

  // Live Real Order Execution via REST / WebSocket
  public async executeRealOrder(orderParams: {
    symbol: string;
    type: "BUY" | "SELL";
    price: number;
    sl: number;
    tp: number | null;
    lots?: number;
    units?: number;
  }): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const res = await fetch("/api/mt5/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderParams),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      // Fallback via WebSocket
      this.send("EXECUTE_REAL_ORDER", orderParams);
      return { success: true };
    }
  }

  // Live Real Order Close
  public async closeRealOrder(ticket: number, closePrice?: number, reason: string = "MANUAL"): Promise<{ success: boolean }> {
    try {
      const res = await fetch("/api/mt5/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, closePrice, reason }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      this.send("CLOSE_REAL_ORDER", { ticket, closePrice, reason });
      return { success: true };
    }
  }

  // Notify tick price update to re-evaluate active MT5 positions
  public updateTick(symbol: string, price: number) {
    this.send("UPDATE_TICK", { symbol, price });
  }

  // Request Order Book Level 2 snapshot for a specific symbol
  public subscribeOrderBook(symbol: string, currentPrice?: number) {
    this.send("SUBSCRIBE_ORDERBOOK", { symbol, price: currentPrice });
  }

  // Synchronize credentials with backend
  public async connectAccount(creds: MT5AccountCredentials) {
    try {
      const res = await fetch("/api/mt5/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to connect account via REST", err);
      return { success: false };
    }
  }

  // Connect specifically to Exness broker account for real algorithmic trading EA
  public async connectExnessAccount(params: {
    server: string;
    login: string;
    accountType: string;
    leverage: string;
    password?: string;
  }) {
    try {
      const res = await fetch("/api/exness/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to connect Exness account", err);
      return { success: false };
    }
  }

  // Fetch current Exness EA gateway status
  public async fetchExnessStatus() {
    try {
      const res = await fetch("/api/exness/status");
      return await res.json();
    } catch (err) {
      return { status: "OFFLINE", error: err };
    }
  }

  public get ready() {
    return this.isConnected;
  }
}

export const mt5BridgeClient = new MT5WebSocketClient();
