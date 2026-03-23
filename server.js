require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID;
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET;
const RELOADLY_ENV = process.env.RELOADLY_ENV || "sandbox";

const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";
const RELOADLY_TOPUP_BASE =
  RELOADLY_ENV === "live"
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";

const RELOADLY_GIFTCARD_BASE =
  RELOADLY_ENV === "live"
    ? "https://giftcards.reloadly.com"
    : "https://giftcards-sandbox.reloadly.com";

async function getReloadlyToken(audience) {
  const res = await fetch(RELOADLY_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: RELOADLY_CLIENT_ID,
      client_secret: RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error_description || "Reloadly auth failed");
  }

  return data.access_token;
}

async function deliverTopup(order) {
  const token = await getReloadlyToken("https://topups.reloadly.com");

  const customer = JSON.parse(order.customer_data || "{}");

  // Atansyon:
  // operatorId, amount, phone, countryCode dwe soti nan frontend ou oswa admin config
  const payload = {
    operatorId: Number(customer.operatorId),
    amount: Number(order.amount),
    useLocalAmount: false,
    customIdentifier: `ORDER-${order.id}`,
    recipientPhone: {
      countryCode: customer.countryCode,
      number: customer.phone
    }
  };

  const res = await fetch(`${RELOADLY_TOPUP_BASE}/topups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Topup delivery failed");
  }

  return {
    providerReference:
      data.transactionId || data.transaction_id || data.customIdentifier || `TOPUP-${order.id}`,
    providerResponse: data
  };
}

async function deliverGiftcard(order) {
  const token = await getReloadlyToken("https://giftcards.reloadly.com");

  const customer = JSON.parse(order.customer_data || "{}");

  // Atansyon:
  // productId ak recipientEmail dwe vini nan order/customer_data
  const payload = {
    productId: Number(customer.productId),
    quantity: 1,
    unitPrice: Number(order.amount),
    recipientEmail: customer.email,
    customIdentifier: `ORDER-${order.id}`,
    senderName: "FastPay",
    recipientName: customer.name || "Client"
  };

  const res = await fetch(`${RELOADLY_GIFTCARD_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Giftcard delivery failed");
  }

  return {
    providerReference:
      data.orderId || data.id || data.customIdentifier || `GIFT-${order.id}`,
    providerResponse: data
  };
}

async function deliverService(order) {
  const service = (order.service || "").toLowerCase();

  if (service === "topup") {
    return await deliverTopup(order);
  }

  if (service === "freefire") {
    // Pou kounya nou trete l tankou topup/digital recharge
    return await deliverTopup(order);
  }

  if (service === "giftcard") {
    return await deliverGiftcard(order);
  }

  if (service === "netflix" || service === "primevideo") {
    return {
      providerReference: `MANUAL-${order.id}`,
      providerResponse: { manual: true, message: "Manual delivery required" }
    };
  }

  throw new Error("Unsupported service");
}

// CREATE ORDER
app.post("/api/checkout/create", async (req, res) => {
  try {
    const { userId, service, productName, amount, customerData } = req.body;

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, service, product_name, amount, status, customer_data)
       VALUES ($1,$2,$3,$4,'pending',$5)
       RETURNING *`,
      [userId, service, productName, amount, JSON.stringify(customerData || {})]
    );

    res.json({ success: true, order: orderResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PAY + AUTO DELIVER
app.post("/api/checkout/pay-and-deliver", async (req, res) => {
  try {
    const { orderId } = req.body;

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

    if (Number(user.balance) < Number(order.amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // 1. retire lajan
    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [order.amount, order.user_id]
    );

    // 2. mete order paid
    await pool.query(
      "UPDATE orders SET status='paid' WHERE id=$1",
      [order.id]
    );

    // 3. ekri transaction payment
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'payment',$2,$2,'completed')`,
      [order.user_id, order.amount]
    );

    // 4. auto deliver
    try {
      const delivery = await deliverService(order);

      const finalStatus =
        delivery.providerResponse && delivery.providerResponse.manual
          ? "manual_required"
          : "delivered";

      await pool.query(
        "UPDATE orders SET status=$1, provider_reference=$2 WHERE id=$3",
        [finalStatus, delivery.providerReference, order.id]
      );

      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, final_amount, status)
         VALUES ($1,'delivery',$2,$2,'completed')`,
        [order.user_id, order.amount]
      );

      return res.json({
        success: true,
        message: finalStatus === "delivered"
          ? "Payment + auto delivery success"
          : "Payment success, manual delivery required",
        orderId: order.id,
        providerReference: delivery.providerReference,
        delivery: delivery.providerResponse
      });
    } catch (deliveryErr) {
      await pool.query(
        "UPDATE orders SET status='delivery_failed' WHERE id=$1",
        [order.id]
      );

      return res.status(500).json({
        success: false,
        message: "Payment success but delivery failed",
        orderId: order.id,
        error: deliveryErr.message
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET USER ORDERS
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
