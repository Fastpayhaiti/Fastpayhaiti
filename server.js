const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const reloadlyRoutes = require("./routes/reloadly");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API ROUTES
app.use("/api/reloadly", reloadlyRoutes);

// TEST ROUTE
app.get("/api/test", (req, res) => {
  res.json({ message: "API ap mache 🔥" });
});

// RELOADLY TEST ROUTE
app.get("/test-reloadly", async (req, res) => {
  try {
    const tokenResponse = await axios.post(
      process.env.RELOADLY_AUTH_URL,
      {
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://topups.reloadly.com"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      message: "Reloadly connected ✅",
      token: tokenResponse.data.access_token
    });
  } catch (error) {
    res.status(500).json({
      error: "Reloadly error ❌",
      details: error.response?.data || error.message
    });
  }
});

// FRONTEND HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.htm"));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
