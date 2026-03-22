const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

/**
 * Pran Reloadly token selon audience
 */
async function getReloadlyToken(audience) {
  const response = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

/**
 * TEST AIRTIME TOKEN
 */
router.get("/test-airtime", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");

    res.json({
      success: true,
      message: "Airtime token OK ✅",
      token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Airtime token error ❌",
      details: error.message
    });
  }
});

/**
 * TEST GIFTCARD TOKEN
 * Si sandbox giftcards pa aktive sou kont ou, sa ka bay erè.
 */
router.get("/test-giftcards", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://giftcards-sandbox.reloadly.com");

    res.json({
      success: true,
      message: "Gift cards token OK ✅",
      token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Gift cards token error ❌",
      details: error.message
    });
  }
});

/**
 * ACCOUNT BALANCE (Airtime sandbox)
 */
router.get("/balance", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");

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
      success: false,
      error: "Balance error ❌",
      details: error.message
    });
  }
});

/**
 * GET COUNTRIES
 */
router.get("/countries", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");

    const response = await fetch("https://topups-sandbox.reloadly.com/countries", {
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
      success: false,
      error: "Countries error ❌",
      details: error.message
    });
  }
});

/**
 * GET OPERATORS BY COUNTRY CODE
 * Egzanp: /api/reloadly/operators/HT
 */
router.get("/operators/:countryCode", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");
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
      success: false,
      error: "Operators error ❌",
      details: error.message
    });
  }
});

/**
 * GET OPERATOR DETAILS
 */
router.get("/operator/:operatorId", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");
    const { operatorId } = req.params;

    const response = await fetch(
      `https://topups-sandbox.reloadly.com/operators/${operatorId}`,
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
      success: false,
      error: "Operator details error ❌",
      details: error.message
    });
  }
});

/**
 * MAKE TOPUP
 */
router.post("/topup", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://topups-sandbox.reloadly.com");

    const {
      operatorId,
      amount,
      useLocalAmount,
      countryCode,
      phone,
      customIdentifier
    } = req.body;

    const response = await fetch("https://topups-sandbox.reloadly.com/topups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operatorId: Number(operatorId),
        amount: Number(amount),
        useLocalAmount: Boolean(useLocalAmount),
        customIdentifier: customIdentifier || `FP-${Date.now()}`,
        recipientPhone: {
          countryCode,
          number: phone
        }
      })
    });

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Topup error ❌",
      details: error.message
    });
  }
});

/**
 * LIST GIFT CARD PRODUCTS
 */
router.get("/giftcards/products", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://giftcards-sandbox.reloadly.com");

    const response = await fetch(
      "https://giftcards-sandbox.reloadly.com/products?size=20&page=1",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/com.reloadly.giftcards-v1+json"
        }
      }
    );

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Gift cards products error ❌",
      details: error.message
    });
  }
});

/**
 * GIFT CARD PRODUCT DETAILS
 */
router.get("/giftcards/product/:productId", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://giftcards-sandbox.reloadly.com");
    const { productId } = req.params;

    const response = await fetch(
      `https://giftcards-sandbox.reloadly.com/products/${productId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/com.reloadly.giftcards-v1+json"
        }
      }
    );

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Gift card product error ❌",
      details: error.message
    });
  }
});

/**
 * BUY GIFT CARD
 */
router.post("/giftcards/order", async (req, res) => {
  try {
    const token = await getReloadlyToken("https://giftcards-sandbox.reloadly.com");

    const {
      productId,
      quantity,
      unitPrice,
      recipientEmail,
      recipientName,
      senderName,
      customIdentifier
    } = req.body;

    const response = await fetch("https://giftcards-sandbox.reloadly.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.giftcards-v1+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: Number(productId),
        quantity: Number(quantity || 1),
        unitPrice: Number(unitPrice),
        recipientEmail,
        recipientName,
        senderName: senderName || "FastPay Haiti",
        customIdentifier: customIdentifier || `GC-${Date.now()}`
      })
    });

    const data = await response.json();
    res.status(response.ok ? 200 : 400).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Gift card order error ❌",
      details: error.message
    });
  }
});

module.exports = router;
