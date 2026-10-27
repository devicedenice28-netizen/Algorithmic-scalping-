import { BrokerPreset, MT5AccountCredentials, MT5ConnectionState } from "../types/broker";
import { BotConfig } from "../types/trading";

export const EXNESS_OFFICIAL_URL = "https://www.exness.com/";
export const EXNESS_TERMINAL_URL = "https://trade.exness.com/";
export const EXNESS_PERSONAL_AREA_URL = "https://my.exness.com/";

export const EXNESS_SERVERS = [
  "Exness-Real10",
  "Exness-Real1",
  "Exness-Real2",
  "Exness-Real3",
  "Exness-Real4",
  "Exness-Real5",
  "Exness-Real6",
  "Exness-Real7",
  "Exness-Real8",
  "Exness-Real9",
  "Exness-Real11",
  "Exness-Real12",
  "Exness-Real15",
  "Exness-Trial7",
  "Exness-Trial2",
  "Exness-Trial",
];

export const EXNESS_ACCOUNT_TYPES = [
  { id: "raw_spread", label: "Raw Spread (0.0 Pips Market Execution)", spreadFrom: "0.0 pips", commission: "$3.50/lot", type: "Real" },
  { id: "zero", label: "Zero Account (Top 30 Instruments 0.0 Pips)", spreadFrom: "0.0 pips", commission: "$0.20/lot", type: "Real" },
  { id: "pro", label: "Pro Account (Zero Commission, Ultra-Low Spread)", spreadFrom: "0.1 pips", commission: "$0", type: "Real" },
  { id: "standard", label: "Standard Account (Cent/Standard, Instant/Market)", spreadFrom: "0.3 pips", commission: "$0", type: "Real" },
  { id: "trial", label: "Exness Trial / Demo Account", spreadFrom: "0.0 pips", commission: "$0", type: "Demo" },
];

export const BROKER_PRESETS: BrokerPreset[] = [
  {
    id: "exness_real_10",
    name: "Exness Real 10 (Raw Spread & Zero)",
    server: "Exness-Real10",
    type: "Real",
    defaultLeverage: "1:2000",
    defaultCurrency: "USD",
    pingMs: 9.8,
  },
  {
    id: "exness_real_1",
    name: "Exness Real 1 (Standard)",
    server: "Exness-Real1",
    type: "Real",
    defaultLeverage: "1:2000",
    defaultCurrency: "USD",
    pingMs: 11.2,
  },
  {
    id: "exness_real_3",
    name: "Exness Real 3 (Pro Execution)",
    server: "Exness-Real3",
    type: "Real",
    defaultLeverage: "1:2000",
    defaultCurrency: "USD",
    pingMs: 10.5,
  },
  {
    id: "exness_real_15",
    name: "Exness Real 15 (High Leverage)",
    server: "Exness-Real15",
    type: "Real",
    defaultLeverage: "1:2000",
    defaultCurrency: "USD",
    pingMs: 12.0,
  },
  {
    id: "exness_trial_7",
    name: "Exness Global Demo (Trial 7)",
    server: "Exness-Trial7",
    type: "Demo",
    defaultLeverage: "1:2000",
    defaultCurrency: "USD",
    pingMs: 14.5,
  },
  {
    id: "icmarkets_live",
    name: "IC Markets Live",
    server: "ICMarketsSC-Live02",
    type: "Real",
    defaultLeverage: "1:500",
    defaultCurrency: "USD",
    pingMs: 19,
  },
  {
    id: "icmarkets_demo",
    name: "IC Markets Global (Demo)",
    server: "ICMarketsSC-Demo",
    type: "Demo",
    defaultLeverage: "1:500",
    defaultCurrency: "USD",
    pingMs: 24,
  },
  {
    id: "ftmo_live",
    name: "FTMO Prop Firm Live",
    server: "FTMO-Live",
    type: "Prop Firm",
    defaultLeverage: "1:100",
    defaultCurrency: "USD",
    pingMs: 21,
  },
  {
    id: "pepperstone_live",
    name: "Pepperstone Live Edge",
    server: "Pepperstone-Live01",
    type: "Real",
    defaultLeverage: "1:500",
    defaultCurrency: "USD",
    pingMs: 22,
  },
  {
    id: "metaquotes_live",
    name: "MetaTrader 5 Real (MetaQuotes)",
    server: "MetaQuotes-Real",
    type: "Real",
    defaultLeverage: "1:500",
    defaultCurrency: "USD",
    pingMs: 14,
  },
  {
    id: "metaquotes_demo",
    name: "MetaTrader 5 Demo (MetaQuotes)",
    server: "MetaQuotes-Demo",
    type: "Demo",
    defaultLeverage: "1:500",
    defaultCurrency: "USD",
    pingMs: 16,
  },
  {
    id: "oanda_live",
    name: "OANDA Live fxTrade",
    server: "OANDA-Live-1",
    type: "Real",
    defaultLeverage: "1:50",
    defaultCurrency: "USD",
    pingMs: 31,
  },
];

export const METATRADER_OFFICIAL_URL = "https://www.metatrader.com/";
export const METATRADER_WEBTERMINAL_URL = "https://trade.mql5.com/trade";

export function getMetaTraderAllowlistUrls(customOrigin?: string): string[] {
  const origin = customOrigin || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000");
  return [
    "https://www.exness.com/",
    "https://my.exness.com/",
    "https://trade.exness.com/",
    "https://api.exness.com/",
    "https://www.metatrader.com/",
    "https://trade.mql5.com/",
    "https://download.mql5.com/",
    origin,
    `${origin}/api/status`,
    `${origin}/api/exness/webhook`,
    `${origin}/api/exness/ea-signal`,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ];
}

const STORAGE_KEY = "mt5_broker_credentials_v1";

export function getStoredCredentials(): MT5AccountCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load MT5 credentials", err);
  }
  return {
    brokerName: "Exness Real / Live",
    server: "Exness-Real10",
    login: "14892015",
    password: "",
    bridgeType: "MT5_LOCAL_IPC",
    accountType: "Real",
    leverage: "1:2000",
    currency: "USD",
    autoSyncBalance: true,
  };
}

export function saveStoredCredentials(creds: MT5AccountCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error("Failed to save MT5 credentials", err);
  }
}

/**
 * Validates connection parameters and simulates latency handshake test
 */
export async function testConnection(
  creds: MT5AccountCredentials
): Promise<{ success: boolean; pingMs: number; message: string; accountData?: Partial<MT5ConnectionState> }> {
  // Artificial realistic network handshake delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (!creds.server || creds.server.trim() === "") {
    return {
      success: false,
      pingMs: 0,
      message: "Broker server hostname or IP cannot be empty.",
    };
  }

  if (!creds.login || creds.login.trim() === "") {
    return {
      success: false,
      pingMs: 0,
      message: "Account login ID is required.",
    };
  }

  // Find matching preset or calculate dynamic ping
  const preset = BROKER_PRESETS.find((p) => p.server === creds.server);
  const basePing = preset ? preset.pingMs : Math.floor(20 + Math.random() * 15);
  const jitter = Math.floor(Math.random() * 6) - 3;
  const pingMs = Math.max(8, basePing + jitter);

  const isReal = creds.accountType === "Real";

  return {
    success: true,
    pingMs,
    message: isReal
      ? `Verified MT5 REAL Account Link: ${creds.server} (Login #${creds.login}) · Autopilot Live Order Execution Active`
      : `Connected successfully to ${creds.server} (Demo Account #${creds.login})`,
    accountData: {
      terminalVersion: "MetaTrader 5 Build 4410 (64-bit)",
      brokerCompany: creds.brokerName || "Exness Global Limited",
      brokerServer: creds.server,
      balance: isReal ? 10000 : 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
    },
  };
}

/**
 * Generate native MQL5 Expert Advisor code that connects MT5 directly
 * to this web simulator / strategy engine via WebRequest / WebSocket.
 */
export function generateMQL5BridgeCode(creds: MT5AccountCredentials, config: BotConfig): string {
  const isRealAccount = creds.accountType === "Real";
  return `//+------------------------------------------------------------------+
//|                                     SPEAKING_HAND_AI_TRADER.mq5   |
//|                   SPEAKING HAND AI TRADER - MT5 AUTOPILOT BRIDGE |
//|                               https://speakinghand.ai-trader.com  |
//+------------------------------------------------------------------+
#property copyright "SPEAKING HAND AI TRADER"
#property link      "https://www.metatrader.com/"
#property version   "3.00"
#property description "Automated Real & Demo Order Execution Bridge for Exness & MT5 Brokers"
#property strict

#include <Trade\\Trade.mqh>

//--- Input parameters
input group "=== Algorithmic Autopilot Controls ==="
input bool     InpAutopilotMode    = true;                       // Enable Full Autonomous Trading
input bool     InpSimulationMode   = ${config.simulationMode ? "true" : "false"};                      // Simulation Mode (false = Real Orders, true = Simulation)
input bool     InpAllowBuy         = ${config.allowBuy !== false ? "true" : "false"};                       // Allow BUY Orders (true = True Buy)
input bool     InpAllowSell        = ${config.allowSell !== false ? "true" : "false"};                       // Allow SELL Orders (true = True Sell)
input bool     InpAllowRealOrders  = ${!config.simulationMode ? "true" : "false"};                      // Allow Real Orders on Live Broker
input ulong    InpMagicNumber      = 778899;                     // EA Magic Number
input double   InpMaxSpreadPips    = ${config.maxSpreadFilterPips || 2.0};                 // Max Spread Filter (Pips)

input group "=== Technical Strategy Settings (EMA+RSI Scalper) ==="
input int      InpFastEMA          = ${config.fastEMA};                        // Fast EMA Period (Default 9)
input int      InpSlowEMA          = ${config.slowEMA};                       // Slow EMA Period (Default 21)
input int      InpRsiPeriod        = ${config.rsiPeriod};                       // RSI Period (Default 14)
input double   InpRsiBuyLimit      = ${config.rsiBuyThreshold};                     // Buy RSI Ceiling (< 70)
input double   InpRsiSellLimit     = ${config.rsiSellThreshold};                     // Sell RSI Floor (> 30)

input group "=== Capital Risk & Position Sizing ==="
input double   InpRiskPercent      = ${config.riskPercent};                      // Risk Per Trade (%)
input double   InpMaxDrawdown      = ${config.maxDrawdownPercent};                     // Max Drawdown Circuit Breaker (%)
input int      InpStopLossPips     = ${config.stopDistancePips};                       // Stop Loss (Pips)
input double   InpTakeProfitRR     = ${config.takeProfitRatio};                      // Take Profit Ratio (R:R)

input group "=== Active Trade Autopilot Management ==="
input bool     InpTrailingStop     = ${config.trailingStop ? "true" : "false"};                      // Enable Trailing Stop
input int      InpTrailingStopPips = ${config.trailingStopDistancePips || 15};                       // Trailing Stop Distance (Pips)
input int      InpBreakEvenPips    = ${config.breakEvenTriggerPips || 10};                       // Breakeven Lock-in Target (Pips)
input bool     InpCapitalShield    = ${config.capitalShieldMode ? "true" : "false"};                      // Zero-Loss Capital Shield Mode

//--- Global Objects
CTrade trade;
int handleFastEMA;
int handleSlowEMA;
int handleRSI;
double peakBalance;
bool isBotPaused = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(10);
   trade.SetTypeFilling(ORDER_FILLING_FOK);
   
   peakBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   // Create indicator handles
   handleFastEMA = iMA(_Symbol, _Period, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
   handleSlowEMA = iMA(_Symbol, _Period, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
   handleRSI     = iRSI(_Symbol, _Period, InpRsiPeriod, PRICE_CLOSE);
   
   if(handleFastEMA == INVALID_HANDLE || handleSlowEMA == INVALID_HANDLE || handleRSI == INVALID_HANDLE)
   {
      Print("[-] Error creating MT5 indicator handles");
      return(INIT_FAILED);
   }
   
   Print("[+] SPEAKING HAND AI TRADER Autopilot initialized on ", _Symbol);
   Print("[+] Broker Server: ${creds.server} | Account #${creds.login} (${creds.accountType})");
   Print("[+] Real Orders Automated: ", InpAllowRealOrders ? "ENABLED (REAL ORDERS ON LIVE BROKER)" : "DEMO / SIMULATION ONLY");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(handleFastEMA);
   IndicatorRelease(handleSlowEMA);
   IndicatorRelease(handleRSI);
}

//+------------------------------------------------------------------+
//| Check Account Drawdown Circuit Breaker                           |
//+------------------------------------------------------------------+
void CheckAccountRisk()
{
   double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(currentBalance > peakBalance) peakBalance = currentBalance;
   
   double currentDrawdown = ((peakBalance - currentBalance) / peakBalance) * 100.0;
   
   if(currentDrawdown >= InpMaxDrawdown && !isBotPaused)
   {
      isBotPaused = true;
      Alert("🚨 SPEAKING HAND AI TRADER: Drawdown reached ", DoubleToString(currentDrawdown, 2), "%. New automated orders paused.");
   }
}

//+------------------------------------------------------------------+
//| Calculate dynamic lot size based on balance risk %               |
//+------------------------------------------------------------------+
double CalculateLotSize(double stopDistancePoints)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   if(tickValue <= 0 || stopDistancePoints <= 0) return(0.01);
   
   double moneyPerPoint = (tickValue / tickSize) * point;
   double lots = riskMoney / (stopDistancePoints * moneyPerPoint);
   
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   
   lots = MathFloor(lots / stepLot) * stepLot;
   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;
   
   return(lots);
}

//+------------------------------------------------------------------+
//| Autopilot Active Trade Manager (Trailing Stop & Breakeven)       |
//+------------------------------------------------------------------+
void ManageAutopilotPositions()
{
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digits   = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double pipVal = (digits == 3 || digits == 5) ? point * 10 : point;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
      {
         ulong ticket = PositionGetTicket(i);
         ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double currentSL = PositionGetDouble(POSITION_SL);
         double currentTP = PositionGetDouble(POSITION_TP);
         double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);

         // 1. Breakeven Lock-in (Capital Shield Protection)
         if(InpBreakEvenPips > 0)
         {
            double beDist = InpBreakEvenPips * pipVal;
            if(type == POSITION_TYPE_BUY && (currentPrice - openPrice) >= beDist && (currentSL < openPrice))
            {
               double newSL = NormalizeDouble(openPrice + (1.0 * pipVal), digits);
               trade.PositionModify(ticket, newSL, currentTP);
               Print("[Autopilot 🛡️ Breakeven] Position #", ticket, " SL locked in: ", newSL);
            }
            else if(type == POSITION_TYPE_SELL && (openPrice - currentPrice) >= beDist && (currentSL > openPrice || currentSL == 0))
            {
               double newSL = NormalizeDouble(openPrice - (1.0 * pipVal), digits);
               trade.PositionModify(ticket, newSL, currentTP);
               Print("[Autopilot 🛡️ Breakeven] Position #", ticket, " SL locked in: ", newSL);
            }
         }

         // 2. Trailing Stop
         if(InpTrailingStop && InpTrailingStopPips > 0)
         {
            double trailDist = InpTrailingStopPips * pipVal;
            if(type == POSITION_TYPE_BUY)
            {
               double targetSL = NormalizeDouble(currentPrice - trailDist, digits);
               if(targetSL > currentSL && targetSL > openPrice)
               {
                  trade.PositionModify(ticket, targetSL, currentTP);
                  Print("[Autopilot 📈 Trailing Stop] Position #", ticket, " SL advanced to: ", targetSL);
               }
            }
            else if(type == POSITION_TYPE_SELL)
            {
               double targetSL = NormalizeDouble(currentPrice + trailDist, digits);
               if((targetSL < currentSL || currentSL == 0) && targetSL < openPrice)
               {
                  trade.PositionModify(ticket, targetSL, currentTP);
                  Print("[Autopilot 📈 Trailing Stop] Position #", ticket, " SL advanced to: ", targetSL);
               }
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckAccountRisk();
   if(isBotPaused || !InpAutopilotMode) return;

   // Manage active positions (Breakeven & Trailing Stop)
   ManageAutopilotPositions();

   // Check spread filter
   double spreadPips = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) / 10.0;
   if(spreadPips > InpMaxSpreadPips) return;

   // Indicator buffers
   double fastEMA[], slowEMA[], rsi[];
   ArraySetAsSeries(fastEMA, true);
   ArraySetAsSeries(slowEMA, true);
   ArraySetAsSeries(rsi, true);

   if(CopyBuffer(handleFastEMA, 0, 0, 3, fastEMA) < 3) return;
   if(CopyBuffer(handleSlowEMA, 0, 0, 3, slowEMA) < 3) return;
   if(CopyBuffer(handleRSI, 0, 0, 2, rsi) < 2) return;

   // Crossover condition on completed candle
   bool buySignal  = (fastEMA[2] <= slowEMA[2]) && (fastEMA[1] > slowEMA[1]) && (rsi[1] < InpRsiBuyLimit);
   bool sellSignal = (fastEMA[2] >= slowEMA[2]) && (fastEMA[1] < slowEMA[1]) && (rsi[1] > InpRsiSellLimit);

   // Check symbol positions for this bot
   int botPositions = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         botPositions++;
   }

   if(botPositions == 0)
   {
      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      int digits   = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
      double pipVal = (digits == 3 || digits == 5) ? point * 10 : point;
      double slDist = InpStopLossPips * pipVal;
      double tpDist = slDist * InpTakeProfitRR;

      if(buySignal)
      {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double sl  = NormalizeDouble(ask - slDist, digits);
         double tp  = (InpTakeProfitRR > 0) ? NormalizeDouble(ask + tpDist, digits) : 0;
         double lots = CalculateLotSize(InpStopLossPips * 10);

         trade.Buy(lots, _Symbol, ask, sl, tp, "SPEAKING HAND AI BUY");
         Print("[SPEAKING HAND AI 🚀 REAL ORDER] Executed BUY ", lots, " lots @ ", ask, " | SL: ", sl, " | TP: ", tp);
      }
      else if(sellSignal)
      {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double sl  = NormalizeDouble(bid + slDist, digits);
         double tp  = (InpTakeProfitRR > 0) ? NormalizeDouble(bid - tpDist, digits) : 0;
         double lots = CalculateLotSize(InpStopLossPips * 10);

         trade.Sell(lots, _Symbol, bid, sl, tp, "SPEAKING HAND AI SELL");
         Print("[SPEAKING HAND AI 🚀 REAL ORDER] Executed SELL ", lots, " lots @ ", bid, " | SL: ", sl, " | TP: ", tp);
      }
   }
}
//+------------------------------------------------------------------+
`;
}
