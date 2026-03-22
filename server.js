const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ Home route
app.get("/", (req, res) => {
  res.send("FastPay API is running 🚀");
});

// ✅ TEST RELOADLY (VERSION FIX)
app.get("/test-reloadly", async (req, res) => {
  try {
    const response = await fetch("https://auth.reloadly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://giftcards.reloadly.com"
      })
    });

    const data = await response.json();

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    res.json({
      error: "Reloadly error ❌",
      details: error.message
    });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
