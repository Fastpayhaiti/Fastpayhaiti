const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

app.use(express.json());


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID;
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET;
const RELOADLY_ENV = (process.env.RELOADLY_ENV || "sandbox").toLowerCase();

const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";

const RELOADLY_TOPUP_AUDIENCE =
  RELOADLY_ENV === "live" || RELOADLY_ENV === "production"
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";

const RELOADLY_GIFTCARD_AUDIENCE =
  RELOADLY_ENV === "live" || RELOADLY_ENV === "production"
    ? "https://giftcards.reloadly.com"
    : "https://giftcards-sandbox.reloadly.com";

const RELOADLY_TOPUP_BASE =
  RELOADLY_ENV === "live" || RELOADLY_ENV === "production"
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";

const RELOADLY_GIFTCARD_BASE =
  RELOADLY_ENV === "live" || RELOADLY_ENV === "production"
    ? "https://giftcards.reloadly.com"
    : "https://giftcards-sandbox.reloadly.com";

async function getReloadlyToken(audience) {
  const res = await fetch(RELOADLY_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: RELOADLY_CLIENT_ID,
      client_secret: RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience
    })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message ||
      data.error_description ||
      data.error ||
      "Reloadly auth failed"
    );
  }

  return data.access_token;
}

async function deliverTopup(order) {
  const token = await getReloadlyToken(RELOADLY_TOPUP_AUDIENCE);
  const customer = JSON.parse(order.customer_data || "{}");

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
    throw new Error(
      data.message ||
      data.errorCode ||
      data.error ||
      "Topup delivery failed"
    );
  }

  return {
    providerReference:
      data.transactionId ||
      data.transaction_id ||
      data.customIdentifier ||
      `TOPUP-${order.id}`,
    providerResponse: data
  };
}

async function deliverGiftcard(order) {
  const token = await getReloadlyToken(RELOADLY_GIFTCARD_AUDIENCE);
  const customer = JSON.parse(order.customer_data || "{}");

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
    throw new Error(
      data.message ||
      data.errorCode ||
      data.error ||
      "Giftcard delivery failed"
    );
  }

  return {
    providerReference:
      data.orderId ||
      data.id ||
      data.customIdentifier ||
      `GIFT-${order.id}`,
    providerResponse: data
  };
}

async function deliverService(order) {
  const service = (order.service || "").toLowerCase();

  if (service === "topup") {
    return await deliverTopup(order);
  }

  if (service === "freefire") {
    return await deliverTopup(order);
  }

  if (service === "giftcard" || service === "giftcards") {
    return await deliverGiftcard(order);
  }

  if (service === "netflix" || service === "primevideo") {
    return {
      providerReference: `MANUAL-${order.id}`,
      providerResponse: {
        manual: true,
        message: "Manual delivery required"
      }
    };
  }

  throw new Error("Unsupported service");
}

// HOME
app.get("/", (req, res) => {
  res.send("FastPay Backend Running 🚀");
});

// TEST RELOADLY
app.get("/test-reloadly", async (req, res) => {
  try {
    const token = await getReloadlyToken(RELOADLY_TOPUP_AUDIENCE);

    res.json({
      success: true,
      message: "Reloadly token generated successfully",
      token: token ? "OK" : "NO TOKEN",
      env: RELOADLY_ENV,
      audience: RELOADLY_TOPUP_AUDIENCE
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET WALLET
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

    if (!userId || !amount) {
      return res.status(400).json({ error: "userId and amount required" });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

// CREATE ORDER
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
       VALUES ($1,$2,$3,$4,'pending',$5)
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

// PAY + AUTO DELIVER
app.post("/api/checkout/pay-and-deliver", async (req, res) => {
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

    if (Number(user.balance) < Number(order.amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [order.amount, order.user_id]
    );

    await pool.query(
      "UPDATE orders SET status='paid' WHERE id=$1",
      [order.id]
    );

    await pool.query(
      `INSERT INTO transactions
      (user_id, type, amount, final_amount, status)
      VALUES ($1,'payment',$2,$2,'completed')`,
      [order.user_id, order.amount]
    );

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
        `INSERT INTO transactions
        (user_id, type, amount, final_amount, status)
        VALUES ($1,'delivery',$2,$2,'completed')`,
        [order.user_id, order.amount]
      );

      return res.json({
        success: true,
        message:
          finalStatus === "delivered"
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

// GET USER TRANSACTIONS
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

// TEST CREATE TOPUP FOR CHROME
app.get("/api/test-topup-create", async (req, res) => {
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id=1");
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User 1 not found" });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, service, product_name, amount, status, customer_data)
       VALUES (1,'topup','Digicel Haiti',10,'pending',$1)
       RETURNING *`,
      [
        JSON.stringify({
          operatorId: 173,
          countryCode: "HT",
          phone: "50937000000"
        })
      ]
    );

    res.json({
      success: true,
      message: "Topup test order created",
      order: orderResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// TEST PAY + DELIVERY FOR CHROME
app.get("/api/test-topup-pay", async (req, res) => {
  try {
    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE user_id=1 AND service='topup' ORDER BY id DESC LIMIT 1"
    );

    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "No topup order found"
      });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Latest topup order is '${order.status}', not pending`
      });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE id=1");
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User 1 not found"
      });
    }

    if (Number(user.balance) < Number(order.amount)) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance"
      });
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id = $2",
      [order.amount, order.user_id]
    );

    await pool.query(
      "UPDATE orders SET status='paid' WHERE id=$1",
      [order.id]
    );

    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'payment',$2,$2,'completed')`,
      [order.user_id, order.amount]
    );

    const delivery = await deliverTopup(order);

    await pool.query(
      "UPDATE orders SET status='delivered', provider_reference=$1 WHERE id=$2",
      [delivery.providerReference, order.id]
    );

    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'delivery',$2,$2,'completed')`,
      [order.user_id, order.amount]
    );

    res.json({
      success: true,
      message: "Topup delivered 🚀",
      orderId: order.id,
      providerReference: delivery.providerReference,
      delivery: delivery.providerResponse
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// CREATE WITHDRAW REQUEST
app.post("/api/withdraw/request", async (req, res) => {
  try {
    const { userId, amount, method, destination, note } = req.body;

    if (!userId || !amount || !method || !destination) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (Number(user.balance) < Number(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const result = await pool.query(
      `INSERT INTO withdrawals (user_id, amount, method, destination, note, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING *`,
      [userId, amount, method, destination, note || ""]
    );

    res.json({
      success: true,
      message: "Withdraw request created",
      withdrawal: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// APPROVE WITHDRAW
app.post("/api/withdraw/approve", async (req, res) => {
  try {
    const { withdrawalId } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: "withdrawalId required" });
    }

    const wdResult = await pool.query(
      "SELECT * FROM withdrawals WHERE id=$1",
      [withdrawalId]
    );
    const withdrawal = wdResult.rows[0];

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        error: `Withdrawal already ${withdrawal.status}`
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [withdrawal.user_id]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Number(user.balance) < Number(withdrawal.amount)) {
      return res.status(400).json({
        error: "Insufficient balance at approval time"
      });
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [withdrawal.amount, withdrawal.user_id]
    );

    await pool.query(
      "UPDATE withdrawals SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=$1",
      [withdrawalId]
    );

    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'withdraw',$2,$2,'completed')`,
      [withdrawal.user_id, withdrawal.amount]
    );

    res.json({
      success: true,
      message: "Withdrawal approved and balance deducted",
      withdrawalId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// REJECT WITHDRAW
app.post("/api/withdraw/reject", async (req, res) => {
  try {
    const { withdrawalId } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({ error: "withdrawalId required" });
    }

    const wdResult = await pool.query(
      "SELECT * FROM withdrawals WHERE id=$1",
      [withdrawalId]
    );
    const withdrawal = wdResult.rows[0];

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        error: `Withdrawal already ${withdrawal.status}`
      });
    }

    await pool.query(
      "UPDATE withdrawals SET status='rejected', rejected_at=CURRENT_TIMESTAMP WHERE id=$1",
      [withdrawalId]
    );

    res.json({
      success: true,
      message: "Withdrawal rejected",
      withdrawalId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET USER WITHDRAWALS
app.get("/api/withdrawals/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM withdrawals WHERE user_id=$1 ORDER BY id DESC",
      [req.params.userId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// TEST WITHDRAW REQUEST FOR CHROME
app.get("/api/test-withdraw-request", async (req, res) => {
  try {
    const userId = 1;
    const amount = 100;
    const method = "MonCash";
    const destination = "50937000000";
    const note = "Test withdraw request";

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User 1 not found" });
    }

    if (Number(user.balance) < Number(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const result = await pool.query(
      `INSERT INTO withdrawals (user_id, amount, method, destination, note, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING *`,
      [userId, amount, method, destination, note]
    );

    res.json({
      success: true,
      message: "Withdraw request created",
      withdrawal: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// TEST WITHDRAW APPROVE FOR CHROME
app.get("/api/test-withdraw-approve", async (req, res) => {
  try {
    const wdResult = await pool.query(
      "SELECT * FROM withdrawals WHERE user_id=1 AND status='pending' ORDER BY id DESC LIMIT 1"
    );
    const withdrawal = wdResult.rows[0];

    if (!withdrawal) {
      return res.status(404).json({ error: "No pending withdrawal found" });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [withdrawal.user_id]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Number(user.balance) < Number(withdrawal.amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await pool.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [withdrawal.amount, withdrawal.user_id]
    );

    await pool.query(
      "UPDATE withdrawals SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=$1",
      [withdrawal.id]
    );

    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'withdraw',$2,$2,'completed')`,
      [withdrawal.user_id, withdrawal.amount]
    );

    res.json({
      success: true,
      message: "Withdrawal approved",
      withdrawalId: withdrawal.id
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
// TEST DEPOSIT FOR CHROME
app.get("/api/test-deposit", async (req, res) => {
  try {
    const userId = 1;
    const amount = 50;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE id=$1",
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [amount, userId]
    );

    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, final_amount, status)
       VALUES ($1,'deposit',$2,$2,'completed')`,
      [userId, amount]
    );

    res.json({
      success: true,
      message: "Test deposit added",
      amount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
