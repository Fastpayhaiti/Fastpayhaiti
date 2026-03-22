const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const depositRoutes = require("./routes/deposits");
const withdrawalRoutes = require("./routes/withdrawals");
const transferRoutes = require("./routes/transfers");
const cardRoutes = require("./routes/cards");

const app = express();

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("FastPay backend is running 🚀");
});

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/cards", cardRoutes);

// PORT
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
