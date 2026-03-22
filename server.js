const express = require("express");
const path = require("path");
require("dotenv").config();

const reloadlyRoutes = require("./routes/reloadly");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.htm"));
});

// Test Reloadly token
app.get("/test-reloadly", async (req, res) => {
  res.redirect("/api/reloadly/test-airtime");
});

// Reloadly routes
app.use("/api/reloadly", reloadlyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
