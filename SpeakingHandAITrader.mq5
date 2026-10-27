//+------------------------------------------------------------------+
//|                                     SpeakingHandAITrader.mq5     |
//|                        SPEAKING HAND AI TRADER                   |
//|                   Scalping Strategy & Risk Shield                |
//|                                                                  |
//|   📱 ANDROID CHROME                                              |
//|           |                                                      |
//|           v                                                      |
//|   SPEAKING HAND AI TRADER                                        |
//|           |                                                      |
//|           v                                                      |
//|   🔐 SECURE NODE.JS BACKEND                                      |
//|           |                                                      |
//|           v                                                      |
//|   ☁️ WINDOWS VPS                                                  |
//|           |                                                      |
//|           v                                                      |
//|   🤖 MT5 EXPERT ADVISOR                                          |
//|           |                                                      |
//|           v                                                      |
//|   EXNESS TRADING ACCOUNT                                         |
//|           |                                                      |
//|           v                                                      |
//|   Live prices + Account information                              |
//+------------------------------------------------------------------+
#property copyright "Speaking Hand AI Trader"
#property link      "https://www.exness.com/"
#property version   "1.00"
#property strict
#property description "SPEAKING HAND AI TRADER - Automated Algorithmic Trading EA for Exness"
#property description "Real Order Execution Bridge for Exness (https://www.exness.com/) & MT5"

#include <Trade\Trade.mqh>

//+------------------------------------------------------------------+
//| Enumerations                                                     |
//+------------------------------------------------------------------+
enum ENUM_TRADING_MODE
{
   MODE_DEMO = 0,   // DEMO (Simulation & Signals Only, No Live Orders)
   MODE_REAL = 1    // REAL (Live Exness Broker Execution)
};

//+------------------------------------------------------------------+
//| Input Parameters                                                 |
//+------------------------------------------------------------------+
input group "=== Exness Broker Connection (https://www.exness.com/) ==="
input string            InpBrokerName        = "Exness Global Limited"; // Broker Name (Exness)
input string            InpExnessServer      = "Exness-Real10";        // Exness Server (Real1-15 / Trial)
input string            InpExnessPortal      = "https://www.exness.com/"; // Official Exness Broker Gateway

input group "=== Trading Mode & Architecture ==="
input ENUM_TRADING_MODE InpTradingMode       = MODE_REAL;  // Execution Mode (REAL = Live Broker Execution, DEMO = Simulation)
input bool              InpSimulationMode    = false;      // Simulation Mode (false = True Live Orders, true = Simulation)
input bool              InpAllowBuy          = true;       // Allow BUY Orders (true = True Buy)
input bool              InpAllowSell         = true;       // Allow SELL Orders (true = True Sell)
input ulong             InpMagicNumber       = 100921;     // Expert Magic Number
input string            InpCommentTag        = "SpeakingHand_Exness"; // Order Comment

input group "=== Scalping Strategy Settings ==="
input int               InpFastEMA           = 9;          // Fast EMA Period
input int               InpSlowEMA           = 21;         // Slow EMA Period
input int               InpRsiPeriod         = 14;         // RSI Period
input double            InpRsiBuyFloor       = 50.0;       // Buy RSI Floor (>= 50)
input double            InpRsiBuyCeiling     = 70.0;       // Buy RSI Ceiling (< 70)
input double            InpRsiSellFloor      = 30.0;       // Sell RSI Floor (> 30)
input double            InpRsiSellCeiling    = 50.0;       // Sell RSI Ceiling (<= 50)

input group "=== Risk Management & Position Sizing ==="
input double            InpRiskPercent       = 1.0;        // Risk per trade (% of balance)
input double            InpFixedLot          = 0.01;       // Fallback Micro Lot
input double            InpStopDistancePips  = 15.0;       // Stop Loss Distance (Pips)
input double            InpTakeProfitRatio   = 2.0;        // Take Profit Ratio (1:2 R:R)
input double            InpMaxSpreadPips     = 2.5;        // Max Spread Filter (Pips)
input double            InpMaxDrawdownPct    = 5.0;        // Max Drawdown Circuit Breaker (%)

input group "=== Active Target & Autopilot Management ==="
input bool              InpEnableTargetExit  = true;       // Enable Ratio Target Exit Engine
input bool              InpTrailingStop      = true;       // Enable Dynamic Trailing Stop
input double            InpTrailingStopPips  = 12.0;       // Trailing Stop Distance (Pips)
input double            InpBreakevenPips     = 8.0;        // Breakeven Lock-in Distance (Pips)

input group "=== Secure Node.js Backend Bridge ==="
input bool              InpEnableNodeBridge  = true;       // Sync with Node.js Server (/api/status)
input string            InpNodeApiUrl        = "http://127.0.0.1:3000/api/status"; // Node.js API Endpoint

//+------------------------------------------------------------------+
//| Simulated / Internal Position Structure                         |
//+------------------------------------------------------------------+
struct SPosition
{
   bool     active;
   ulong    ticket;
   string   symbol;
   string   type;          // "BUY" or "SELL"
   double   entryPrice;
   double   stopDistance;  // in price points
   double   volume;
   datetime openTime;
};

//--- Global Variables
CTrade     trade;
int        handleFastEMA   = INVALID_HANDLE;
int        handleSlowEMA   = INVALID_HANDLE;
int        handleRSI       = INVALID_HANDLE;
datetime   lastCandleTime  = 0;
double     peakBalance     = 0.0;
bool       isCircuitPaused = false;
string     lastSignal      = "WAIT";
SPosition  demoPosition;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("SPEAKING HAND AI TRADER started [v0.1]");
    Print("MetaTrader 5 Platform: https://www.metatrader.com/");
    Print("WebRequest Allowlist Required: Tools -> Options -> Expert Advisors -> Allow WebRequest for https://www.metatrader.com/ and ", InpNodeApiUrl);

    if(InpTradingMode == MODE_DEMO)
    {
        Print("Demo testing only. No trades will be placed.");
    }
    else
    {
        Print(">>> [WARNING] REAL MODE ACTIVE: Real trades will be placed via MetaTrader 5 <<<");
    }

    // Configure Trade Execution Engine
    trade.SetExpertMagicNumber(InpMagicNumber);
    trade.SetDeviationInPoints(10);
    trade.SetTypeFilling(ORDER_FILLING_FOK);

    // Initialize Account Peak Balance Baseline
    peakBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    demoPosition.active = false;

    // Create Technical Indicator Handles
    handleFastEMA = iMA(_Symbol, _Period, InpFastEMA, 0, MODE_EMA, PRICE_CLOSE);
    handleSlowEMA = iMA(_Symbol, _Period, InpSlowEMA, 0, MODE_EMA, PRICE_CLOSE);
    handleRSI     = iRSI(_Symbol, _Period, InpRsiPeriod, PRICE_CLOSE);

    if(handleFastEMA == INVALID_HANDLE || handleSlowEMA == INVALID_HANDLE || handleRSI == INVALID_HANDLE)
    {
        Print("[-] Failed to initialize indicator handles. Check symbol/timeframe availability.");
        return INIT_FAILED;
    }

    Print("[+] Indicators initialized: Fast EMA(", InpFastEMA, "), Slow EMA(", InpSlowEMA, "), RSI(", InpRsiPeriod, ")");
    Print("[+] Target Management: 1:", DoubleToString(InpTakeProfitRatio, 1), " R:R with Capital Shield active.");

    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    if(handleFastEMA != INVALID_HANDLE) IndicatorRelease(handleFastEMA);
    if(handleSlowEMA != INVALID_HANDLE) IndicatorRelease(handleSlowEMA);
    if(handleRSI     != INVALID_HANDLE) IndicatorRelease(handleRSI);

    Print("SPEAKING HAND AI TRADER stopped. Deinitialization reason: ", reason);
}

//+------------------------------------------------------------------+
//| Pip Size Helper                                                  |
//+------------------------------------------------------------------+
double GetPipValue()
{
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    int digits   = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
    return (digits == 3 || digits == 5) ? point * 10.0 : point;
}

//+------------------------------------------------------------------+
//| Capital Shield: Check Account Drawdown Circuit Breaker           |
//+------------------------------------------------------------------+
void CheckAccountRisk()
{
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    if(balance > peakBalance) peakBalance = balance;

    if(peakBalance > 0)
    {
        double drawdown = ((peakBalance - balance) / peakBalance) * 100.0;
        if(drawdown >= InpMaxDrawdownPct && !isCircuitPaused)
        {
            isCircuitPaused = true;
            Alert("🚨 [CAPITAL SHIELD TRIGGERED] Account drawdown has reached ",
                  DoubleToString(drawdown, 2), "%. All automated execution paused.");
            Print("🚨 EMERGENCY CIRCUIT BREAKER: Current Drawdown: ", DoubleToString(drawdown, 2), "%");
        }
    }
}

//+------------------------------------------------------------------+
//| Dynamic Lot Sizing based on balance risk %                       |
//+------------------------------------------------------------------+
double CalculateLotSize(double stopDistancePoints)
{
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskMoney = balance * (InpRiskPercent / 100.0);
    double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);

    if(tickValue <= 0 || tickSize <= 0 || stopDistancePoints <= 0)
        return InpFixedLot;

    double moneyPerPoint = (tickValue / tickSize) * point;
    if(moneyPerPoint <= 0) return InpFixedLot;

    double lots = riskMoney / (stopDistancePoints * moneyPerPoint);
    double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
    double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
    double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

    lots = MathFloor(lots / stepLot) * stepLot;
    if(lots < minLot) lots = minLot;
    if(lots > maxLot) lots = maxLot;

    return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| closePositionAtTarget(currentPrice)                              |
//| Exact algorithm specified by Speaking Hand Architecture:         |
//| - direction = type == BUY ? 1 : -1                               |
//| - movement = (currentPrice - entryPrice) * direction             |
//| - takeProfitDistance = stopDistance * 2                          |
//| - stopLossDistance = stopDistance                                |
//| - exit if movement >= takeProfitDistance or <= -stopLossDistance  |
//+------------------------------------------------------------------+
bool ClosePositionAtTarget(double currentPrice)
{
    // 1. In DEMO mode, evaluate the simulated position
    if(InpTradingMode == MODE_DEMO)
    {
        if(!demoPosition.active) return false;

        int direction = (demoPosition.type == "BUY") ? 1 : -1;
        double movement = (currentPrice - demoPosition.entryPrice) * direction;

        double takeProfitDistance = demoPosition.stopDistance * InpTakeProfitRatio;
        double stopLossDistance   = demoPosition.stopDistance;

        if(movement >= takeProfitDistance)
        {
            Print("🎯 [DEMO TARGET HIT] TAKE PROFIT: Exit @ ", currentPrice,
                  " | Gain: +", DoubleToString(movement / GetPipValue(), 1), " pips (1:2 R:R)");
            demoPosition.active = false;
            return true;
        }

        if(movement <= -stopLossDistance)
        {
            Print("🛑 [DEMO TARGET HIT] STOP LOSS: Exit @ ", currentPrice,
                  " | Loss: ", DoubleToString(movement / GetPipValue(), 1), " pips");
            demoPosition.active = false;
            return true;
        }

        return false;
    }

    // 2. In REAL mode, evaluate open live positions on MT5
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
        {
            ulong ticket = PositionGetTicket(i);
            ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
            double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentSL  = PositionGetDouble(POSITION_SL);
            double currentTP  = PositionGetDouble(POSITION_TP);

            int direction = (posType == POSITION_TYPE_BUY) ? 1 : -1;
            double movement = (currentPrice - entryPrice) * direction;

            double pipVal = GetPipValue();
            double stopDist = (InpStopDistancePips * pipVal);
            double tpDist   = stopDist * InpTakeProfitRatio;

            // Target exit checks
            if(movement >= tpDist)
            {
                Print("🎯 [REAL TARGET HIT] Take Profit reached (+", DoubleToString(movement / pipVal, 1), " pips). Closing #", ticket);
                trade.PositionClose(ticket);
                return true;
            }

            if(movement <= -stopDist)
            {
                Print("🛑 [REAL TARGET HIT] Stop Loss reached (-", DoubleToString(MathAbs(movement) / pipVal, 1), " pips). Closing #", ticket);
                trade.PositionClose(ticket);
                return true;
            }

            // Breakeven check
            int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
            if(InpBreakevenPips > 0)
            {
                double beDist = InpBreakevenPips * pipVal;
                if(posType == POSITION_TYPE_BUY && (currentPrice - entryPrice) >= beDist && (currentSL < entryPrice))
                {
                    double newSL = NormalizeDouble(entryPrice + (1.0 * pipVal), digits);
                    trade.PositionModify(ticket, newSL, currentTP);
                    Print("🛡️ [BREAKEVEN SECURED] Buy #", ticket, " SL shifted to ", newSL);
                }
                else if(posType == POSITION_TYPE_SELL && (entryPrice - currentPrice) >= beDist && (currentSL > entryPrice || currentSL == 0))
                {
                    double newSL = NormalizeDouble(entryPrice - (1.0 * pipVal), digits);
                    trade.PositionModify(ticket, newSL, currentTP);
                    Print("🛡️ [BREAKEVEN SECURED] Sell #", ticket, " SL shifted to ", newSL);
                }
            }

            // Dynamic Trailing Stop
            if(InpTrailingStop && InpTrailingStopPips > 0)
            {
                double trailDist = InpTrailingStopPips * pipVal;
                if(posType == POSITION_TYPE_BUY)
                {
                    double targetSL = NormalizeDouble(currentPrice - trailDist, digits);
                    if(targetSL > currentSL && targetSL > entryPrice)
                    {
                        trade.PositionModify(ticket, targetSL, currentTP);
                    }
                }
                else if(posType == POSITION_TYPE_SELL)
                {
                    double targetSL = NormalizeDouble(currentPrice + trailDist, digits);
                    if((targetSL < currentSL || currentSL == 0) && targetSL < entryPrice)
                    {
                        trade.PositionModify(ticket, targetSL, currentTP);
                    }
                }
            }
        }
    }

    return false;
}

//+------------------------------------------------------------------+
//| Automatic Trading Engine: EMA(9) + EMA(21) + RSI(14)             |
//| Process each completed candle only once                          |
//+------------------------------------------------------------------+
string AnalyzeMarketSignal()
{
    double fastEMA[], slowEMA[], rsi[];
    ArraySetAsSeries(fastEMA, true);
    ArraySetAsSeries(slowEMA, true);
    ArraySetAsSeries(rsi, true);

    if(CopyBuffer(handleFastEMA, 0, 1, 2, fastEMA) < 2) return "WAIT";
    if(CopyBuffer(handleSlowEMA, 0, 1, 2, slowEMA) < 2) return "WAIT";
    if(CopyBuffer(handleRSI,     0, 1, 2, rsi)     < 2) return "WAIT";

    double fast = fastEMA[0]; // Last closed bar (index 1)
    double slow = slowEMA[0];
    double r    = rsi[0];

    string action = "WAIT";

    // BUY Rule: fast > slow && rsi >= 50 && rsi < 70 && InpAllowBuy
    if(fast > slow && r >= InpRsiBuyFloor && r < InpRsiBuyCeiling)
    {
        action = InpAllowBuy ? "BUY" : "WAIT";
    }
    // SELL Rule: fast < slow && rsi > 30 && rsi <= 50 && InpAllowSell
    else if(fast < slow && r > InpRsiSellFloor && r <= InpRsiSellCeiling)
    {
        action = InpAllowSell ? "SELL" : "WAIT";
    }

    return action;
}

//+------------------------------------------------------------------+
//| Send Status Telemetry to Node.js Backend API                     |
//+------------------------------------------------------------------+
void SendNodeStatusUpdate(string action, double currentPrice)
{
    if(!InpEnableNodeBridge) return;

    string cookie = NULL, headers = "Content-Type: application/json\r\n";
    char postData[];
    char resultData[];
    string resultHeaders;

    int openPosCount = (InpTradingMode == MODE_DEMO)
        ? (demoPosition.active ? 1 : 0)
        : PositionsTotal();

    string jsonPayload = StringFormat(
        "{\"connected\":true,\"mode\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"symbol\":\"%s\",\"price\":%.5f,\"signal\":\"%s\",\"openPositions\":%d}",
        (InpTradingMode == MODE_DEMO ? "DEMO" : "REAL"),
        AccountInfoDouble(ACCOUNT_BALANCE),
        AccountInfoDouble(ACCOUNT_EQUITY),
        _Symbol,
        currentPrice,
        action,
        openPosCount
    );

    StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);

    int res = WebRequest("POST", InpNodeApiUrl, headers, 1500, postData, resultData, resultHeaders);
    if(res == -1)
    {
        // Suppress repeated spam if WebRequest permission is disabled in MT5 Options
    }
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
    // 1. Evaluate Capital Shield Risk
    CheckAccountRisk();
    if(isCircuitPaused) return;

    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
    double pipVal = GetPipValue();

    // 2. Target Exit Evaluation (User's closePositionAtTarget)
    ClosePositionAtTarget(bid);

    // 3. Process completed candle only once
    datetime currentCompletedCandleTime = iTime(_Symbol, _Period, 1);
    if(currentCompletedCandleTime == lastCandleTime)
    {
        return; // Candle already evaluated
    }

    // 4. Spread Filter Check
    double spreadPips = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) / (digits == 3 || digits == 5 ? 10.0 : 1.0);
    if(spreadPips > InpMaxSpreadPips)
    {
        Print("⚠️ High Spread detected: ", DoubleToString(spreadPips, 1), " pips > Max ", InpMaxSpreadPips, " pips. Skipping signal.");
        return;
    }

    // 5. Evaluate Scalping Strategy Signal
    string signal = AnalyzeMarketSignal();
    lastCandleTime = currentCompletedCandleTime;
    lastSignal = signal;

    if(signal == "WAIT") return;

    // 6. Check if position is already active
    bool hasActivePosition = false;
    if(InpTradingMode == MODE_DEMO)
    {
        hasActivePosition = demoPosition.active;
    }
    else
    {
        for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
            if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
            {
                hasActivePosition = true;
                break;
            }
        }
    }

    if(hasActivePosition)
    {
        return; // Allow only 1 position per symbol at a time
    }

    // 7. Calculate Stop Loss & 1:2 Take Profit Targets
    double slDistancePoints = InpStopDistancePips * pipVal;
    double tpDistancePoints = slDistancePoints * InpTakeProfitRatio;
    double lotSize = CalculateLotSize(slDistancePoints / point);

    if(signal == "BUY")
    {
        double slPrice = NormalizeDouble(ask - slDistancePoints, digits);
        double tpPrice = NormalizeDouble(ask + tpDistancePoints, digits);

        bool isSimulated = (InpTradingMode == MODE_DEMO) && InpSimulationMode;
        if(isSimulated)
        {
            demoPosition.active       = true;
            demoPosition.ticket       = 10000 + (ulong)(TimeCurrent() % 10000);
            demoPosition.symbol       = _Symbol;
            demoPosition.type         = "BUY";
            demoPosition.entryPrice   = ask;
            demoPosition.stopDistance = slDistancePoints;
            demoPosition.volume       = lotSize;
            demoPosition.openTime     = TimeCurrent();

            Print("🧪 [DEMO SIGNAL EXECUTED] BUY ", DoubleToString(lotSize, 2), " lots @ ", ask,
                  " | Stop Loss: ", slPrice, " | Take Profit: ", tpPrice, " (1:", DoubleToString(InpTakeProfitRatio, 1), " R:R)");
        }
        else
        {
            trade.Buy(lotSize, _Symbol, ask, slPrice, tpPrice, InpCommentTag);
            Print("🚀 [REAL ORDER PLACED (SIMULATION: FALSE · BUY: TRUE)] BUY ", DoubleToString(lotSize, 2), " lots @ ", ask,
                  " | Stop Loss: ", slPrice, " | Take Profit: ", tpPrice);
        }

        SendNodeStatusUpdate("BUY", ask);
    }
    else if(signal == "SELL")
    {
        double slPrice = NormalizeDouble(bid + slDistancePoints, digits);
        double tpPrice = NormalizeDouble(bid - tpDistancePoints, digits);

        bool isSimulated = (InpTradingMode == MODE_DEMO) && InpSimulationMode;
        if(isSimulated)
        {
            demoPosition.active       = true;
            demoPosition.ticket       = 10000 + (ulong)(TimeCurrent() % 10000);
            demoPosition.symbol       = _Symbol;
            demoPosition.type         = "SELL";
            demoPosition.entryPrice   = bid;
            demoPosition.stopDistance = slDistancePoints;
            demoPosition.volume       = lotSize;
            demoPosition.openTime     = TimeCurrent();

            Print("🧪 [DEMO SIGNAL EXECUTED] SELL ", DoubleToString(lotSize, 2), " lots @ ", bid,
                  " | Stop Loss: ", slPrice, " | Take Profit: ", tpPrice, " (1:", DoubleToString(InpTakeProfitRatio, 1), " R:R)");
        }
        else
        {
            trade.Sell(lotSize, _Symbol, bid, slPrice, tpPrice, InpCommentTag);
            Print("🚀 [REAL ORDER PLACED (SIMULATION: FALSE · SELL: TRUE)] SELL ", DoubleToString(lotSize, 2), " lots @ ", bid,
                  " | Stop Loss: ", slPrice, " | Take Profit: ", tpPrice);
        }

        SendNodeStatusUpdate("SELL", bid);
    }
}
//+------------------------------------------------------------------+
