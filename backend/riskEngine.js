function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateVolatilityRisk(change24h) {
  const change = Math.abs(Number(change24h) || 0);

  return clamp((change / 10) * 30, 0, 30);
}

function calculateRangeRisk(high24h, low24h) {
  const high = Number(high24h);
  const low = Number(low24h);

  if (!high || !low || high <= 0 || low <= 0) {
    return 15;
  }

  const range = ((high - low) / high) * 100;

  return clamp((range / 10) * 25, 0, 25);
}

function calculateLiquidityRisk(quoteVolume24h) {
  const volume = Number(quoteVolume24h) || 0;

  if (volume >= 1000000000) return 2;
  if (volume >= 500000000) return 5;
  if (volume >= 100000000) return 8;
  if (volume >= 25000000) return 12;
  if (volume >= 5000000) return 16;

  return 20;
}

function calculateTrendRisk(change24h) {
  const change = Number(change24h) || 0;

  if (change <= -10) return 15;
  if (change <= -5) return 12;
  if (change < 0) return 8;
  if (change < 5) return 5;

  return 3;
}

function calculatePositionRisk(price, high24h, low24h) {
  const current = Number(price);
  const high = Number(high24h);
  const low = Number(low24h);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    high <= low
  ) {
    return 5;
  }

  const position = (current - low) / (high - low);

  return clamp((1 - clamp(position, 0, 1)) * 10, 0, 10);
}

function getRiskLevel(score) {
  if (score >= 75) return "High Risk";
  if (score >= 50) return "Moderate Risk";
  if (score >= 25) return "Low Risk";

  return "Very Low Risk";
}

function buildSummary(coin, score) {
  const name = coin.name || coin.symbol;
  const change = Number(coin.change24h) || 0;

  let movement;

  if (change > 5) {
    movement =
      "The asset is experiencing strong positive 24-hour price movement.";
  } else if (change > 0) {
    movement =
      "The asset is showing positive 24-hour price movement.";
  } else if (change < -5) {
    movement =
      "The asset is experiencing significant negative 24-hour price movement.";
  } else if (change < 0) {
    movement =
      "The asset is showing negative 24-hour price movement.";
  } else {
    movement =
      "The asset has experienced relatively limited 24-hour price movement.";
  }

  let assessment;

  if (score >= 75) {
    assessment =
      `${name} currently shows elevated short-term risk based on the available market indicators.`;
  } else if (score >= 50) {
    assessment =
      `${name} currently shows moderate short-term risk. Several market indicators require attention.`;
  } else if (score >= 25) {
    assessment =
      `${name} currently shows relatively lower short-term risk compared with highly volatile assets.`;
  } else {
    assessment =
      `${name} currently shows relatively low short-term risk according to the available market indicators.`;
  }

  return `${assessment} ${movement}`;
}

function analyzeRisk(coin) {
  const volatilityRisk =
    calculateVolatilityRisk(coin.change24h);

  const rangeRisk =
    calculateRangeRisk(
      coin.high24h,
      coin.low24h
    );

  const liquidityRisk =
    calculateLiquidityRisk(
      coin.quoteVolume24h
    );

  const trendRisk =
    calculateTrendRisk(coin.change24h);

  const positionRisk =
    calculatePositionRisk(
      coin.price,
      coin.high24h,
      coin.low24h
    );

  const score = Math.round(
    clamp(
      volatilityRisk +
        rangeRisk +
        liquidityRisk +
        trendRisk +
        positionRisk,
      0,
      100
    )
  );

  const rangePercent =
    coin.high24h && coin.low24h
      ? ((coin.high24h - coin.low24h) /
          coin.high24h) *
        100
      : 0;

  const marketPosition =
    coin.high24h &&
    coin.low24h &&
    coin.high24h !== coin.low24h
      ? ((coin.price - coin.low24h) /
          (coin.high24h - coin.low24h)) *
        100
      : 0;

  return {
    score,

    level: getRiskLevel(score),

    summary: buildSummary(coin, score),

    factors: [
      {
        name: "24h Volatility",
        score: Math.round(volatilityRisk),
        max: 30,
        description:
          "Measures the risk contribution from 24-hour price movement."
      },
      {
        name: "24h Price Range",
        score: Math.round(rangeRisk),
        max: 25,
        description:
          "Measures the size of the asset's 24-hour high-to-low range."
      },
      {
        name: "Liquidity",
        score: Math.round(liquidityRisk),
        max: 20,
        description:
          "Uses 24-hour quote volume as a simple liquidity-risk indicator."
      },
      {
        name: "Market Trend",
        score: Math.round(trendRisk),
        max: 15,
        description:
          "Accounts for recent positive or negative price momentum."
      },
      {
        name: "Market Position",
        score: Math.round(positionRisk),
        max: 10,
        description:
          "Estimates the current price position within the 24-hour range."
      }
    ],

    metrics: {
      volatility: {
        value: Math.abs(
          Number(coin.change24h) || 0
        ),
        risk: Math.round(volatilityRisk)
      },

      drawdown: {
        value: rangePercent,
        risk: Math.round(rangeRisk)
      },

      liquidity: {
        value:
          Number(coin.quoteVolume24h) || 0,
        risk: Math.round(liquidityRisk)
      },

      marketTrend: {
        value:
          Number(coin.change24h) || 0,
        risk: Math.round(trendRisk)
      },

      marketPosition: {
        value: marketPosition,
        risk: Math.round(positionRisk)
      }
    },

    timestamp: Date.now()
  };
}

module.exports = {
  analyzeRisk
};