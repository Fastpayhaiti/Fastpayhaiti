app.get("/test-reloadly", async (req, res) => {
  try {
    const response = await fetch(process.env.RELOADLY_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://topups.reloadly.com"
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
