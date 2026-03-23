require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// HOME
app.get("/", (req, res) => {
  res.send("FastPay Backend Running 🚀");
});

// WALLET
app.get("/api/wallet/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
    res.json(result.rows[0] || { error: "User not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEPOSIT
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

    res.json({ success: true, message: "Deposit added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE CHECKOUT ORDER
app.post("/api/checkout/create", async (req, res) => {
  try {
    const { userId, service, productName, amount, customerData } = req.body;

    if (!userId || !service || !productName || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, service, product_name, amount, status, customer_data)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [userId, service, productName, amount, JSON.stringify(customerData || {})]
    );

    res.json({
      success: true,
      order: orderResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PAY ORDER WITH WALLET
app.post("/api/checkout/pay", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "orderId required" });
    }

    const orderResult = await pool.query("SELECT * FROM orders WHERE id=$1", [orderId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ error: "Order already processed" });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [order.user_id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const amount = Number(order.amount);

    if (Number(user.balance) < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // retire lajan nan wallet
    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [amount, order.user_id]
    );

    // make order paid first
    await pool.query(
      "UPDATE orders SET status='paid' WHERE id=$1",
      [orderId]
    );

    // log transaction
    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, final_amount, status)
      VALUES ($1, 'payment', $2, $2, 'completed')`,
      [order.user_id, amount]
    );

    res.json({
      success: true,
      message: "Order paid successfully",
      orderId: orderId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AUTO DELIVERY SIMULATION
app.post("/api/orders/deliver", async (req, res) => {
  try {
    const { orderId } = req.body;

    const orderResult = await pool.query("SELECT * FROM orders WHERE id=$1", [orderId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({ error: "Order not ready for delivery" });
    }

    // simulation delivery
    let providerReference = "FP-" + Date.now();

    await pool.query(
      "UPDATE orders SET status='delivered', provider_reference=$1 WHERE id=$2",
      [providerReference, orderId]
    );

    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, final_amount, status)
      VALUES ($1, 'delivery', $2, $2, 'completed')`,
      [order.user_id, order.amount]
    );

    res.json({
      success: true,
      message: "Service delivered successfully",
      providerReference
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ORDERS BY USER
app.get("/api/orders/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC",
      [req.params.userId]
    );
    res.json(result.rows);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running 🚀"));
