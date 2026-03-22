const express = require("express");
const axios = require("axios");

const router = express.Router();

// GET TOKEN
async function getToken(audience) {
  const res = await axios.post(process.env.RELOADLY_AUTH_URL, {
    client_id: process.env.RELOADLY_CLIENT_ID,
    client_secret: process.env.RELOADLY_CLIENT_SECRET,
    grant_type: "client_credentials",
    audience: audience
  });

  return res.data.access_token;
}

/* ========= TOPUP ========= */

router.get("/operators/:country", async (req, res) => {
  try {
    const token = await getToken(process.env.RELOADLY_AIRTIME_BASE_URL);

    const response = await axios.get(
      `${process.env.RELOADLY_AIRTIME_BASE_URL}/operators/countries/${req.params.country}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});

router.post("/topup", async (req, res) => {
  try {
    const { operatorId, amount, phone, country } = req.body;

    const token = await getToken(process.env.RELOADLY_AIRTIME_BASE_URL);

    const response = await axios.post(
      `${process.env.RELOADLY_AIRTIME_BASE_URL}/topups`,
      {
        operatorId: Number(operatorId),
        amount: Number(amount),
        useLocalAmount: false,
        recipientPhone: {
          countryCode: country,
          number: phone
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});

/* ========= GIFT CARDS ========= */

router.get("/giftcards", async (req, res) => {
  try {
    const token = await getToken(process.env.RELOADLY_GIFTCARD_BASE_URL);

    const response = await axios.get(
      `${process.env.RELOADLY_GIFTCARD_BASE_URL}/products`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});

router.post("/giftcards", async (req, res) => {
  try {
    const { productId, email, name, amount } = req.body;

    const token = await getToken(process.env.RELOADLY_GIFTCARD_BASE_URL);

    const response = await axios.post(
      `${process.env.RELOADLY_GIFTCARD_BASE_URL}/orders`,
      {
        productId: Number(productId),
        quantity: 1,
        unitPrice: Number(amount),
        recipientEmail: email,
        recipientName: name,
        senderName: "FastPay"
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json(err.response?.data || err.message);
  }
});

module.exports = router;
