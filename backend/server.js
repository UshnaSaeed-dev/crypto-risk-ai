const express = require("express");
const cors = require("cors");
const path = require("path");

const coinsModule = require("./coins");

const {
  getMarketData,
  getSingleMarketData,
  getAgentStatus,
  tryConnectAgentOS
} = require("./agent");

const {
  analyzeRisk
} = require("./riskEngine");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ================================
   COIN LIST
================================ */

function getCoinsList() {
  if (Array.isArray(coinsModule)) {
    return coinsModule;
  }

  if (Array.isArray(coinsModule.coins)) {
    return coinsModule.coins;
  }

  return [];
}


/* ================================
   HEALTH
================================ */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CryptoRisk AI",
    agent: "Binance Agent OS",
    trading: false,
    readOnly: true
  });
});


/* ================================
   AGENT STATUS
================================ */

app.get("/api/agent/status", (req, res) => {
  res.json(getAgentStatus());
});


/* ================================
   TOP 100 COINS
================================ */

app.get("/api/coins", async (req, res) => {
  try {
    const coins = getCoinsList();

    if (!coins.length) {
      return res.status(500).json({
        success: false,
        error: "Coin list is empty."
      });
    }

    const marketData =
      await getMarketData(coins);

    res.json({
      success: true,
      count: marketData.length,
      trading: false,
      dataSource: getAgentStatus().mode,
      coins: marketData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error(
      "GET /api/coins error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/* ================================
   ANALYZE COIN
================================ */

app.post("/api/analyze", async (req, res) => {
  try {
    /*
     * Accept:
     *
     * BTC
     * btc
     * BTCUSDT
     * btcusdt
     */
    let requestedSymbol =
      req.body?.symbol;

    if (!requestedSymbol) {
      return res.status(400).json({
        success: false,
        error: "Coin symbol is required."
      });
    }

    let symbol =
      String(requestedSymbol)
        .trim()
        .toUpperCase();

    /*
     * Remove Binance pair suffix.
     */
    if (symbol.endsWith("USDT")) {
      symbol =
        symbol.slice(
          0,
          -4
        );
    }

    console.log(
      `Analyzing coin: ${symbol}`
    );

    const coins =
      getCoinsList();

    /*
     * Find the coin using several
     * possible formats.
     */
    const coinInfo =
      coins.find((coin) => {

        if (!coin) {
          return false;
        }

        const coinSymbol =
          String(
            coin.symbol || ""
          )
            .trim()
            .toUpperCase();

        const coinBinanceSymbol =
          String(
            coin.binanceSymbol || ""
          )
            .trim()
            .toUpperCase();

        return (
          coinSymbol === symbol ||
          coinBinanceSymbol ===
            `${symbol}USDT`
        );
      });

    /*
     * If it isn't in the list,
     * return a clear error.
     */
    if (!coinInfo) {
      console.log(
        "Supported symbols:",
        coins
          .map(
            (coin) =>
              coin?.symbol
          )
          .filter(Boolean)
          .join(", ")
      );

      return res.status(404).json({
        success: false,
        error:
          `${symbol} is not included in the supported Top 100 list.`
      });
    }

    /*
     * Get fresh Binance data.
     */
    const marketCoin =
      await getSingleMarketData(
        symbol
      );

    if (
      !marketCoin ||
      !marketCoin.available
    ) {
      return res.status(404).json({
        success: false,
        error:
          `${symbol} does not currently have an available USDT market on Binance.`
      });
    }

    /*
     * Combine static coin information
     * with LIVE Binance data.
     */
    const coin = {
      ...coinInfo,
      ...marketCoin
    };

    /*
     * Calculate risk.
     */
    const analysis =
      analyzeRisk(coin);

    res.json({
      success: true,

      coin: {
        rank:
          coin.rank ?? null,

        name:
          coin.name ||
          coin.symbol,

        symbol:
          coin.symbol,

        binanceSymbol:
          coin.binanceSymbol,

        price:
          coin.price,

        change24h:
          coin.change24h,

        volume24h:
          coin.volume24h,

        quoteVolume24h:
          coin.quoteVolume24h,

        high24h:
          coin.high24h,

        low24h:
          coin.low24h,

        openPrice:
          coin.openPrice
      },

      analysis,

      agent: {
        ...getAgentStatus(),
        tradingEnabled: false
      },

      disclaimer:
        "This analysis is for educational purposes only and is not financial advice or a trading recommendation.",

      timestamp: Date.now()
    });

  } catch (error) {
    console.error(
      "POST /api/analyze error:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/* ================================
   TEST AGENT OS
================================ */

app.post(
  "/api/agent/connect",
  async (req, res) => {
    try {
      const connected =
        await tryConnectAgentOS();

      res.json({
        success: true,
        connected,
        status:
          getAgentStatus()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);


/* ================================
   FRONTEND
================================ */

const frontendPath =
  path.join(
    __dirname,
    "..",
    "frontend"
  );

app.use(
  express.static(
    frontendPath
  )
);


/*
 * Express 5 compatible fallback.
 */
app.use((req, res) => {
  res.sendFile(
    path.join(
      frontendPath,
      "index.html"
    )
  );
});


/* ================================
   START SERVER
================================ */

app.listen(
  PORT,
  () => {

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "        CRYPTO RISK AI"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      "Agent: Binance Agent OS"
    );

    console.log(
      "Trading: DISABLED"
    );

    console.log(
      "Mode: READ-ONLY"
    );

    console.log(
      "Market Data: LIVE Binance"
    );

    console.log(
      "========================================"
    );

    console.log("");
  }
);