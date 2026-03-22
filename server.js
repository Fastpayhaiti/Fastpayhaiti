require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// HOME
app.get("/", (req, res) => {
  res.send("FastPay Backend Running 🚀");
});

// REGISTER
app.post("/api/register", async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, balance) VALUES ($1, $2, 0) RETURNING *",
      [name, email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WALLET
app.get("/api/wallet/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [req.params.id]
    );
    res.json(result.rows[0] || { error: "User not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEST DEPOSIT
app.get("/api/test-deposit", async (req, res) => {
  try {
    const amount = 50;

    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [amount, 1]
    );

    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, final_amount, status)
      VALUES ($1, 'deposit', $2, $2, 'completed')`,
      [1, amount]
    );

    res.json({
      success: true,
      message: "Deposit added",
      amount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NORMAL DEPOSIT
app.post("/api/deposit", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [amount, userId]
    );

    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, final_amount, status)
      VALUES ($1,'deposit',$2,$2,'completed')`,
      [userId, amount]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RELOADLY TOKEN
async function getToken() {
  const res = await fetch("https://auth.reloadly.com/oauth/token", {
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

// RELOADLY BALANCE
app.get("/api/reloadly/balance", async (req, res) => {
  try {
    const token = await getToken();

    const response = await fetch("https://topups-sandbox.reloadly.com/accounts/balance", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOPUP
app.post("/api/topup", async (req, res) => {
  try {
    const { userId, operatorId, amount, phone, countryCode } = req.body;

    const fee = 0.5;
    const total = Number(amount) + fee;

    const user = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.json({ error: "User not found" });
    }

    if (Number(user.rows[0].balance) < total) {
      return res.json({ error: "Insufficient balance" });
    }

    const token = await getToken();

    const response = await fetch("https://topups-sandbox.reloadly.com/topups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/com.reloadly.topups-v1+json"
      },
      body: JSON.stringify({
        operatorId: Number(operatorId),
        amount: Number(amount),
        useLocalAmount: false,
        recipientPhone: {
          countryCode,
          number: phone
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.json(data);
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [total, userId]
    );

    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, fee, profit, final_amount, phone, status)
      VALUES ($1,'topup',$2,$3,$3,$4,$5,'completed')`,
      [userId, amount, fee, total, phone]
    );

    res.json({
      success: true,
      message: "Topup successful",
      charged: total,
      profit: fee
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TRANSACTIONS
app.get("/api/transactions/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY id DESC",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PROFIT
app.get("/api/profit", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COALESCE(SUM(profit),0) as total_profit FROM transactions"
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running 🚀"));
