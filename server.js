app.get("/api/test-deposit", async (req, res) => {
  await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [50, 1]
  );

  await pool.query(
    "INSERT INTO transactions (user_id, type, amount, final_amount, status) VALUES ($1,'deposit',$2,$2,'completed')",
    [1, 50]
  );

  res.json({ success: true, message: "Deposit added", amount: 50 });
});
