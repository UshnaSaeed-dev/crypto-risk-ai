const API_BASE = "";

let coins = [];

const $ = (id) => document.getElementById(id);

const coinSearch = $("coinSearch");
const searchResults = $("searchResults");
const analyzeButton = $("analyzeButton");
const loading = $("loading");
const results = $("results");
const errorMessage = $("errorMessage");
const coinList = $("coinList");
const coinCount = $("coinCount");

// ================================
// START
// ================================

document.addEventListener("DOMContentLoaded", loadCoins);

// ================================
// LOAD TOP 100
// ================================

async function loadCoins() {
    try {
        showLoading(true);
        hideError();

        const response = await fetch(`${API_BASE}/api/coins`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Failed to load coins.");
        }

        coins = Array.isArray(data.coins) ? data.coins : [];

        coinCount.textContent = coins.length;

        renderCoins(coins);
        setupSearch();

    } catch (error) {
        console.error(error);
        showError(error.message || "Unable to load market data.");
    } finally {
        showLoading(false);
    }
}

// ================================
// RENDER COINS
// ================================

function renderCoins(list) {
    coinList.innerHTML = "";

    if (!list.length) {
        coinList.innerHTML = `
            <div class="coin-list-empty">
                No cryptocurrencies available.
            </div>
        `;
        return;
    }

    list.forEach((coin) => {
        const symbol = String(coin.symbol || "").toUpperCase();
        const name = coin.name || symbol;

        const change = Number(coin.change24h);

        let changeClass = "neutral";

        if (change > 0) {
            changeClass = "positive";
        } else if (change < 0) {
            changeClass = "negative";
        }

        const price =
            coin.available && coin.price != null
                ? formatPrice(coin.price)
                : "N/A";

        const changeText =
            Number.isFinite(change)
                ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
                : "N/A";

        const row = document.createElement("div");

        row.className = "coin-row";

        row.innerHTML = `
            <div class="coin-rank">
                ${coin.rank ?? "-"}
            </div>

            <div class="coin-identity">

                <div class="coin-logo-wrap">
                    <img
                        class="coin-logo"
                        src="${getCoinLogo(symbol)}"
                        alt="${escapeHtml(symbol)}"
                    >

                    <div class="coin-fallback">
                        ${getFallback(symbol)}
                    </div>
                </div>

                <div class="coin-details">
                    <div class="coin-name">
                        ${escapeHtml(name)}
                    </div>

                    <div class="coin-symbol">
                        ${escapeHtml(symbol)}
                    </div>
                </div>

            </div>

            <div class="coin-price">
                ${price}
            </div>

            <div class="coin-change ${changeClass}">
                ${changeText}
            </div>

            <button
                type="button"
                class="coin-analyze"
            >
                Analyze
            </button>
        `;

        const image = row.querySelector(".coin-logo");
        const fallback = row.querySelector(".coin-fallback");

        image.addEventListener("load", () => {
            image.style.display = "block";
            fallback.style.display = "none";
        });

        image.addEventListener("error", () => {
            image.style.display = "none";
            fallback.style.display = "flex";
        });

        row.querySelector(".coin-analyze")
            .addEventListener("click", () => {
                analyzeCoin(symbol);
            });

        coinList.appendChild(row);
    });
}

// ================================
// SEARCH
// ================================

function setupSearch() {
    coinSearch.addEventListener("input", handleSearch);

    document.addEventListener("click", (event) => {
        if (
            !coinSearch.contains(event.target) &&
            !searchResults.contains(event.target)
        ) {
            searchResults.innerHTML = "";
        }
    });
}

function handleSearch() {
    const query = coinSearch.value.trim().toLowerCase();

    searchResults.innerHTML = "";

    if (!query) {
        return;
    }

    const matches = coins
        .filter((coin) => {
            const name = String(coin.name || "").toLowerCase();
            const symbol = String(coin.symbol || "").toLowerCase();

            return (
                name.includes(query) ||
                symbol.includes(query)
            );
        })
        .slice(0, 8);

    if (!matches.length) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                No matching cryptocurrency found.
            </div>
        `;
        return;
    }

    matches.forEach((coin) => {
        const symbol = String(coin.symbol || "").toUpperCase();

        const item = document.createElement("div");

        item.className = "search-result";

        item.innerHTML = `
            <div class="result-main">

                <div class="coin-mini-icon">
                    <img
                        src="${getCoinLogo(symbol)}"
                        alt="${escapeHtml(symbol)}"
                    >
                    <span>${getFallback(symbol)}</span>
                </div>

                <div>
                    <span class="result-name">
                        ${escapeHtml(coin.name || symbol)}
                    </span>

                    <span class="result-symbol">
                        ${escapeHtml(symbol)}
                    </span>
                </div>

            </div>

            <span class="result-rank">
                #${coin.rank ?? "-"}
            </span>
        `;

        const image = item.querySelector("img");
        const fallback = item.querySelector("span");

        image.addEventListener("load", () => {
            image.style.display = "block";
            fallback.style.display = "none";
        });

        image.addEventListener("error", () => {
            image.style.display = "none";
            fallback.style.display = "flex";
        });

        item.addEventListener("click", () => {
            coinSearch.value = symbol;
            searchResults.innerHTML = "";
            analyzeCoin(symbol);
        });

        searchResults.appendChild(item);
    });
}

// ================================
// MAIN ANALYZE BUTTON
// ================================

analyzeButton.addEventListener("click", () => {
    const input = coinSearch.value.trim();

    if (!input) {
        showError("Please enter a coin symbol.");
        return;
    }

    const coin = findCoin(input);

    if (!coin) {
        showError(
            "Coin is not included in the supported Top 100 list."
        );
        return;
    }

    analyzeCoin(coin.symbol);
});

// ================================
// FIND COIN
// ================================

function findCoin(value) {
    const query = String(value)
        .trim()
        .toUpperCase();

    const symbol =
        query.endsWith("USDT")
            ? query.slice(0, -4)
            : query;

    return coins.find((coin) => {
        const coinSymbol =
            String(coin.symbol || "")
                .trim()
                .toUpperCase();

        const coinName =
            String(coin.name || "")
                .trim()
                .toUpperCase();

        const binanceSymbol =
            String(coin.binanceSymbol || "")
                .trim()
                .toUpperCase();

        return (
            coinSymbol === query ||
            coinSymbol === symbol ||
            coinName === query ||
            binanceSymbol === query ||
            binanceSymbol === `${symbol}USDT`
        );
    });
}

// ================================
// ANALYZE
// ================================

async function analyzeCoin(symbol) {
    try {
        showLoading(true);
        hideError();

        results.classList.add("hidden");

        const response = await fetch(
            `${API_BASE}/api/analyze`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    symbol: String(symbol).toUpperCase()
                })
            }
        );

        const data = await response.json();

        console.log("Analysis:", data);

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Analysis failed."
            );
        }

        renderAnalysis(data);

    } catch (error) {
        console.error(error);
        showError(
            error.message ||
            "Unable to analyze this cryptocurrency."
        );
    } finally {
        showLoading(false);
    }
}

// ================================
// DISPLAY ANALYSIS
// ================================

function renderAnalysis(data) {
    const coin = data.coin || {};
    const analysis = data.analysis || {};
    const metrics = analysis.metrics || {};

    const rank = $("assetRank");
    const name = $("assetName");
    const symbol = $("assetSymbol");
    const price = $("assetPrice");
    const change = $("assetChange");
    const icon = $("assetIcon");

    rank.textContent =
        coin.rank ? `#${coin.rank}` : "";

    name.textContent =
        coin.name || coin.symbol || "-";

    symbol.textContent =
        coin.symbol
            ? coin.symbol.toUpperCase()
            : "-";

    price.textContent =
        formatPrice(coin.price);

    const changeValue =
        Number(coin.change24h) || 0;

    change.textContent =
        `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`;

    change.classList.remove(
        "positive",
        "negative",
        "neutral"
    );

    change.classList.add(
        changeValue > 0
            ? "positive"
            : changeValue < 0
                ? "negative"
                : "neutral"
    );

    icon.src = getCoinLogo(coin.symbol);
    icon.alt = coin.symbol || "";

    icon.onerror = () => {
        icon.style.display = "none";
    };

    // Risk score
    const score =
        Number(analysis.score) || 0;

    $("riskScore").textContent = score;

    $("riskLevel").textContent =
        analysis.level || "Unknown";

    $("riskSummary").textContent =
        analysis.summary || "No analysis available.";

    $("riskBar").style.width =
        `${Math.min(Math.max(score, 0), 100)}%`;

    // Metrics
    updateMetric(
        $("volatilityValue"),
        $("volatilityBar"),
        metrics.volatility?.value,
        10
    );

    updateMetric(
        $("drawdownValue"),
        $("drawdownBar"),
        metrics.drawdown?.value,
        10
    );

    updateMetric(
        $("liquidityValue"),
        $("liquidityBar"),
        metrics.liquidity?.value,
        1000000000,
        true
    );

    updateMetric(
        $("marketTrendValue"),
        $("marketTrendBar"),
        metrics.marketTrend?.value,
        10
    );

    updateMetric(
        $("marketPositionValue"),
        $("marketPositionBar"),
        metrics.marketPosition?.value,
        100
    );

    // Market overview
    $("marketChange").textContent =
        `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}%`;

    $("marketChange").classList.remove(
        "positive",
        "negative"
    );

    $("marketChange").classList.add(
        changeValue >= 0
            ? "positive"
            : "negative"
    );

    $("marketVolume").textContent =
        formatLargeNumber(coin.quoteVolume24h);

    $("marketCap").textContent =
        "Live data unavailable";

    results.classList.remove("hidden");

    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ================================
// METRICS
// ================================

function updateMetric(
    valueElement,
    barElement,
    value,
    maximum,
    largeNumber = false
) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        valueElement.textContent = "N/A";
        barElement.style.width = "0%";
        return;
    }

    valueElement.textContent =
        largeNumber
            ? formatLargeNumber(number)
            : `${number.toFixed(2)}%`;

    const percentage =
        Math.min(
            Math.max(
                (Math.abs(number) / maximum) * 100,
                0
            ),
            100
        );

    barElement.style.width =
        `${percentage}%`;
}

// ================================
// FORMATTING
// ================================

function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    if (number >= 1000) {
        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    if (number >= 1) {
        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    }

    if (number >= 0.01) {
        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
    }

    return number.toLocaleString("en-US", {
        maximumFractionDigits: 10
    });
}

function formatLargeNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    if (number >= 1e12) {
        return `${(number / 1e12).toFixed(2)}T`;
    }

    if (number >= 1e9) {
        return `${(number / 1e9).toFixed(2)}B`;
    }

    if (number >= 1e6) {
        return `${(number / 1e6).toFixed(2)}M`;
    }

    if (number >= 1e3) {
        return `${(number / 1e3).toFixed(2)}K`;
    }

    return number.toFixed(2);
}

// ================================
// LOGOS
// ================================

function getCoinLogo(symbol) {
    if (!symbol) return "";

    const s = String(symbol).trim().toLowerCase();

    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${s}.png`;
}

function getFallback(symbol) {
    if (!symbol) {
        return "?";
    }

    return String(symbol)
        .substring(0, 2)
        .toUpperCase();
}

// ================================
// UI
// ================================

function showLoading(show) {
    if (!loading) return;

    loading.classList.toggle(
        "hidden",
        !show
    );
}

function showError(message) {
    if (!errorMessage) return;

    errorMessage.textContent = message;

    errorMessage.classList.remove(
        "hidden"
    );
}

function hideError() {
    if (!errorMessage) return;

    errorMessage.classList.add(
        "hidden"
    );
}

// ================================
// SECURITY
// ================================

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}