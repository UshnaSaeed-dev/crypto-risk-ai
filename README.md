# CryptoRisk AI

### AI-Powered Cryptocurrency Risk Analysis using Binance Agent OS

CryptoRisk AI is a read-only cryptocurrency risk analysis application that uses **Binance Agent OS** to access cryptocurrency market data and provide market-based risk analysis for major cryptocurrencies.

The system analyzes current market conditions and presents an overall risk score, risk level, and individual risk factors through a simple and interactive dashboard.

---

## 🚀 Features

- 🤖 Binance Agent OS integration
- 📊 Real-time cryptocurrency market data
- 🛡️ Cryptocurrency risk scoring
- 📈 Market-based risk factors
- 💰 Current cryptocurrency prices
- 📉 24-hour price changes
- 🔎 Cryptocurrency search
- 🪙 Support for major cryptocurrencies
- 📋 Top cryptocurrency market overview
- ⚡ Interactive risk analysis dashboard
- 🔐 Read-only architecture
- 🚫 No cryptocurrency trading

---

## 🧠 How It Works

CryptoRisk AI uses Binance Agent OS to retrieve cryptocurrency market information through the **Model Context Protocol (MCP)**.

The retrieved market data is processed by the application's risk analysis engine, which evaluates relevant market factors and generates an overall risk score.

```text
User
 │
 ▼
CryptoRisk AI Dashboard
 │
 ▼
Cryptocurrency Selection
 │
 ▼
Binance Agent OS
 │
 ▼
Market Data
 │
 ▼
Risk Analysis Engine
 │
 ▼
Risk Score & Risk Factors
 │
 ▼
Results Dashboard
```

---

## 🏗️ Project Structure

```text
crypto-risk-ai/
│
├── backend/
│   ├── agent.js
│   ├── coins.js
│   ├── riskEngine.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── .vscode/
│   └── mcp.json
│
└── README.md
```

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive Web Design

### Backend

- Node.js
- Express.js

### AI & Blockchain Integration

- Binance Agent OS
- Model Context Protocol (MCP)
- Binance Market Data

---

## 🔌 Binance Agent OS

CryptoRisk AI integrates with **Binance Agent OS** through its MCP server.

```text
https://agent.binance.com/mcp/agentic
```

Binance Agent OS provides access to cryptocurrency market information that is used by CryptoRisk AI for its risk analysis process.

The application is designed around a **read-only architecture** and does not perform cryptocurrency trading.

---

## 📊 Risk Analysis

The system processes cryptocurrency market data and generates an overall risk assessment.

The dashboard provides:

- **Overall Risk Score**
- **Risk Level**
- **Risk Factors**
- **Current Market Price**
- **24-Hour Price Change**
- **Market Statistics**

The risk analysis is intended to provide users with a simplified understanding of the current market risk associated with a selected cryptocurrency.

---

## 🔐 Security & Trading Policy

CryptoRisk AI is strictly designed for **read-only cryptocurrency analysis**.

- No order placement
- No cryptocurrency trading
- No withdrawals
- No access to user funds
- No private trading API keys
- Market analysis only

---

## 💻 Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd crypto-risk-ai
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Start the application

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5000
```

---

## 🌐 Using the Application

Open:

```text
http://localhost:5000
```

Then:

1. Search for a cryptocurrency.
2. Select the cryptocurrency.
3. Start the risk analysis.
4. View the overall risk score.
5. Review the risk factors.
6. Examine the current market data.


