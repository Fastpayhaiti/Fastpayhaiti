const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const reloadlyRoutes = require("./routes/reloadly");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ROUTES
app.use("/api/reloadly", reloadlyRoutes);

// TEST ROUTE
app.get("/api/test", (req, res) => {
  res.json({ message: "API ap mache 🔥" });
});

// FRONTEND
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.htm"));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
