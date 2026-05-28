// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const auctions = require("./routes/auctions");
const me = require("./routes/me");
const notifications = require("./routes/notifications");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

// LOG EVERY REQUEST
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auctions", auctions);
app.use("/api/me", me);
app.use("/api/notifications", notifications);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});