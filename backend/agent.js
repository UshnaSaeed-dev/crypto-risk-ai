const BINANCE_API = "https://api.binance.com";
const AGENT_OS_MCP_URL = process.env.BINANCE_AGENT_OS_MCP_URL || "https://agent.binance.com/mcp/agentic";

let mcpClient = null;
let mcpConnected = false;
let mcpAttempted = false;
let mcpError = null;
let mcpSessionId = null;
const MCP_TOOL = "spot.ticker24hr";

function parseMcpResponse(response, text) {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return JSON.parse(text);
  const events = text.split(/\r?\n\r?\n/);
  for (let i = events.length - 1; i >= 0; i--) {
    const line = events[i].split(/\r?\n/).find(x => x.startsWith("data:"));
    if (!line) continue;
    try { return JSON.parse(line.slice(5).trim()); } catch (_) {}
  }
  throw new Error("Could not parse Binance Agent OS MCP response.");
}

async function mcpPost(method, params = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
  };
  if (mcpSessionId) headers["Mcp-Session-Id"] = mcpSessionId;

  const response = await fetch(AGENT_OS_MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  const session = response.headers.get("Mcp-Session-Id");
  if (session) mcpSessionId = session;
  const text = await response.text();
  if (!response.ok) throw new Error(`Binance Agent OS MCP HTTP ${response.status}: ${text.slice(0, 300)}`);
  return parseMcpResponse(response, text);
}

async function tryConnectAgentOS() {
  if (mcpAttempted) return mcpConnected;
  mcpAttempted = true;
  try {
    const initialized = await mcpPost("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "CryptoRisk AI", version: "1.0.0" }
    });
    if (initialized.error) throw new Error(initialized.error.message || "MCP initialize failed.");
    await mcpPost("notifications/initialized", {});
    const listed = await mcpPost("tools/list", {});
    const tools = listed.result?.tools || [];
    if (!tools.some(t => t.name === MCP_TOOL)) throw new Error(`${MCP_TOOL} is not available from Binance Agent OS.`);
    mcpConnected = true;
    mcpError = null;
    console.log("✓ Binance Agent OS MCP connected; tool:", MCP_TOOL);
    return true;
  } catch (error) {
    mcpConnected = false;
    mcpError = error.message;
    console.log("ℹ Binance Agent OS unavailable; using Binance Public Market Data fallback:", error.message);
    return false;
  }
}

function normalizeTicker(result) {
  let data = result?.structuredContent || result;
  if (result?.content) {
    for (const item of result.content) {
      if (item.type === "text" && item.text) {
        try { data = JSON.parse(item.text); break; } catch (_) {}
      }
    }
  }
  const root = data?.result || data?.data || data?.ticker || data;
  const num = (...keys) => {
    for (const k of keys) if (root?.[k] !== undefined) return Number(root[k]);
    return NaN;
  };
  const ticker = {
    price: num("lastPrice", "price", "last"),
    change24h: num("priceChangePercent", "changePercent"),
    volume24h: num("volume"),
    quoteVolume24h: num("quoteVolume", "quoteVolume24h"),
    high24h: num("highPrice", "high24h", "high"),
    low24h: num("lowPrice", "low24h", "low"),
    openPrice: num("openPrice", "open"),
    tradeCount: num("count", "tradeCount")
  };
  if (!Number.isFinite(ticker.price)) throw new Error("Binance Agent OS returned no usable price.");
  for (const key of Object.keys(ticker)) if (!Number.isFinite(ticker[key])) ticker[key] = 0;
  return ticker;
}

async function callAgentOSTicker(symbol) {
  if (!await tryConnectAgentOS()) return null;
  const result = await mcpPost("tools/call", {
    name: MCP_TOOL,
    arguments: { symbol: `${String(symbol).toUpperCase()}USDT` }
  });
  if (result.error) throw new Error(result.error.message || "Binance Agent OS tool call failed.");
  return normalizeTicker(result.result);
}

async function getBinancePublicData() {
  const response = await fetch(`${BINANCE_API}/api/v3/ticker/24hr`);
  if (!response.ok) throw new Error(`Binance Public API returned HTTP ${response.status}`);
  return response.json();
}

function toBinanceSymbol(symbol) {
  const value = String(symbol).trim().toUpperCase();
  return value.endsWith("USDT") ? value : `${value}USDT`;
}

function tickerToMarket(coin, ticker, source) {
  return {
    ...coin,
    symbol: String(coin.symbol).toUpperCase(),
    binanceSymbol: toBinanceSymbol(coin.symbol),
    available: true,
    price: ticker.price,
    change24h: ticker.change24h,
    volume24h: ticker.volume24h,
    quoteVolume24h: ticker.quoteVolume24h,
    high24h: ticker.high24h,
    low24h: ticker.low24h,
    openPrice: ticker.openPrice,
    tradeCount: ticker.tradeCount,
    dataSource: source,
    timestamp: Date.now()
  };
}

async function getMarketData(coins) {
  const results = [];
  for (const coin of coins) {
    try {
      const ticker = await callAgentOSTicker(coin.symbol);
      if (ticker) {
        results.push(tickerToMarket(coin, ticker, "Binance Agent OS MCP"));
        continue;
      }
    } catch (error) {
      mcpError = error.message;
      mcpConnected = false;
    }
    results.push(null);
  }

  const missing = results.map((v, i) => v ? null : i).filter(i => i !== null);
  if (missing.length) {
    const rest = await getBinancePublicData();
    const map = new Map(rest.map(t => [t.symbol, t]));
    for (const i of missing) {
      const coin = coins[i];
      const t = map.get(toBinanceSymbol(coin.symbol));
      results[i] = t ? tickerToMarket(coin, {
        price: Number(t.lastPrice), change24h: Number(t.priceChangePercent), volume24h: Number(t.volume),
        quoteVolume24h: Number(t.quoteVolume), high24h: Number(t.highPrice), low24h: Number(t.lowPrice),
        openPrice: Number(t.openPrice), tradeCount: Number(t.count)
      }, "Binance Public Market Data (fallback)") : { ...coin, available: false, price: null, dataSource: "Unavailable" };
    }
  }
  return results;
}

async function getSingleMarketData(symbol) {
  try {
    const ticker = await callAgentOSTicker(symbol);
    if (ticker) return tickerToMarket({ rank: null, name: symbol, symbol }, ticker, "Binance Agent OS MCP");
  } catch (error) {
    mcpError = error.message;
    mcpConnected = false;
  }
  const data = await getBinancePublicData();
  const t = data.find(x => x.symbol === toBinanceSymbol(symbol));
  if (!t) return { rank: null, name: symbol, symbol: String(symbol).toUpperCase(), binanceSymbol: toBinanceSymbol(symbol), available: false, dataSource: "Unavailable" };
  return tickerToMarket({ rank: null, name: symbol, symbol }, {
    price: Number(t.lastPrice), change24h: Number(t.priceChangePercent), volume24h: Number(t.volume), quoteVolume24h: Number(t.quoteVolume),
    high24h: Number(t.highPrice), low24h: Number(t.lowPrice), openPrice: Number(t.openPrice), tradeCount: Number(t.count)
  }, "Binance Public Market Data (fallback)");
}

function getAgentStatus() {
  return {
    connected: mcpConnected,
    attempted: mcpAttempted,
    mode: mcpConnected ? "binance-agent-os-mcp" : "binance-public-api-fallback",
    agent: "Binance Agent OS",
    mcpUrl: AGENT_OS_MCP_URL,
    tool: MCP_TOOL,
    toolAvailable: mcpConnected,
    tradingEnabled: false,
    apiKeysRequired: false,
    readOnly: true,
    dataSource: mcpConnected ? "Binance Agent OS MCP" : "Binance Public Market Data (fallback)",
    error: mcpError
  };
}

module.exports = { getMarketData, getSingleMarketData, getAgentStatus, tryConnectAgentOS };
