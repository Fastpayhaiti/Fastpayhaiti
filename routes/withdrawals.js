const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  res.json({ message: "Withdrawals route ready" });
});

module.exports = router;
