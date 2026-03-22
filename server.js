const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =========================
   DEMO DATA
========================= */
let users = [
  {
    id: 1,
    name: "Luckystore",
    email: "luckystore@example.com",
    balance: 100.0 // USD demo wallet
  }
];

let transactions = [];

/* =========================
   HELPERS
========================= */
async function getReloadlyToken() {
  const response = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: "https://topups-sandbox.reloadly.com"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
  if (require("fs").existsSync(path.join(__dirname, "index.htm"))) {
    return res.sendFile(path.join(__dirname, "index.htm"));
  }
  res.send("FastPay API is running 🚀");
});

/* =========================
   RELOADLY TEST ROUTES
========================= */
app.get("/test-reloadly", async (req, res) => {
  try {
    const token = await getReloadlyToken();
    res.json({
      http_ok: true,
      access_token: token
    });
  } catch (error) {
    res.status(400).json({
      http_ok: false,
      details: error.message
    });
  }
});

app.get("/api/reloadly/balance", async (req, res) => {
  try {
    const token = await getReloadlyToken();

    const response = await fetch("https://topups-sandbox.reloadly.com/accounts/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json"
      }
    });

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Balance error ❌",
      details: error.message
    });
  }
});

app.get("/api/reloadly/operators/:countryCode", async (req, res) => {
  try {
    const token = await getReloadlyToken();
    const { countryCode } = req.params;

    const response = await fetch(
      `https://topups-sandbox.reloadly.com/operators/countries/${countryCode}?includeBundles=true&includeData=true&includePin=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/com.reloadly.topups-v1+json"
        }
      }
    );

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Operators error ❌",
      details: error.message
    });
  }
});

/* =========================
   WALLET ROUTES
========================= */
app.get("/api/wallet/:userId", (req, res) => {
  const user = users.find(u => u.id == req.params.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    userId: user.id,
    name: user.name,
    email: user.email,
    balance: user.balance
  });
});

app.post("/api/wallet/add", (req, res) => {
  const { userId, amount } = req.body;
  const user = users.find(u => u.id == userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  user.balance += amt;

  transactions.push({
    id: Date.now(),
    type: "deposit",
    userId: user.id,
    amount: amt,
    fee: 0,
    profit: 0,
    finalCharged: amt,
    status: "completed",
    date: new Date().toISOString()
  });

  res.json({
    success: true,
    message: "Wallet rechaje avèk siksè ✅",
    newBalance: user.balance
  });
});

/* =========================
   TOPUP + DEDUCTION + PROFIT
========================= */
app.post("/api/topup", async (req, res) => {
  try {
    const {
      userId,
      operatorId,
      amount,
      phone,
      countryCode,
      useLocalAmount
    } = req.body;

    const user = users.find(u => u.id == userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const amt = Number(amount);
    if (!operatorId || !amt || !phone || !countryCode) {
      return res.status(400).json({ error: "Tanpri ranpli tout chan yo." });
    }

    // BENEFIS OU
    const fee = 0.5; // $0.50 sou chak topup
    const total = amt + fee;

    if (user.balance < total) {
      return res.status(400).json({
        error: "Balans pa sifi.",
        currentBalance: user.balance,
        needed: total
      });
    }

    // pran token reloadly
    const token = await getReloadlyToken();

    // voye topup sandbox
    const response = await fetch("https://topups-sandbox.reloadly.com/topups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operatorId: Number(operatorId),
        amount: amt,
        useLocalAmount: Boolean(useLocalAmount),
        customIdentifier: `FP-${Date.now()}`,
        recipientPhone: {
          countryCode,
          number: phone
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: "Topup la pa pase.",
        details: data
      });
    }

    // retire lajan sou wallet user la
    user.balance -= total;

    // anrejistre tranzaksyon
    transactions.push({
      id: Date.now(),
      type: "topup",
      userId: user.id,
      operatorId: Number(operatorId),
      phone,
      countryCode,
      amount: amt,
      fee,
      profit: fee,
      finalCharged: total,
      reloadlyResponse: data,
      status: "completed",
      date: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Topup fèt avèk siksè ✅",
      walletBefore: Number((user.balance + total).toFixed(2)),
      amount: amt,
      fee,
      totalCharged: total,
      newBalance: Number(user.balance.toFixed(2)),
      topupResponse: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Topup error ❌",
      details: error.message
    });
  }
});

/* =========================
   PROFIT + TRANSACTIONS
========================= */
app.get("/api/transactions", (req, res) => {
  res.json(transactions);
});

app.get("/api/transactions/:userId", (req, res) => {
  const userTx = transactions.filter(t => t.userId == req.params.userId);
  res.json(userTx);
});

app.get("/api/profit", (req, res) => {
  const totalProfit = transactions.reduce((sum, t) => sum + Number(t.profit || 0), 0);
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.finalCharged || 0), 0);

  res.json({
    totalProfit: Number(totalProfit.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalTransactions: transactions.length
  });
});

/* =========================
   DEMO PAGES
========================= */
app.get("/wallet.html", (req, res) => {
  res.sendFile(path.join(__dirname, "wallet.html"));
});

app.get("/admin-wallet.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-wallet.html"));
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
