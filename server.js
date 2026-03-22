const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("FastPay API is running 🚀");
});

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
        audience: "https://topups-sandbox.reloadly.com"
      })
    });

    const data = await response.json();

    res.status(response.ok ? 200 : 400).json({
      http_ok: response.ok,
      data
    });
  } catch (error) {
    res.status(500).json({
      http_ok: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
