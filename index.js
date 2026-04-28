const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ---------------- STORAGE ---------------- */
const smsStore = {};
const users = {};
const ipStore = {};

/* ---------------- HELPERS ---------------- */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getIP(req) {
  return (req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || req.socket.remoteAddress;
}

function rateLimit(ip) {
  const now = Date.now();
  if (!ipStore[ip]) ipStore[ip] = [];

  ipStore[ip] = ipStore[ip].filter(t => now - t < 10 * 60 * 1000);

  if (ipStore[ip].length >= 5) return true;

  ipStore[ip].push(now);
  return false;
}

/* ---------------- HEALTH ---------------- */
app.get("/health", (req, res) => {
  res.send("OK");
});

/* ---------------- SMS SEND ---------------- */
app.post("/send-code", (req, res) => {
  const { phone, consent, ageConfirmed } = req.body;
  const ip = getIP(req);

  if (!consent) return res.json({ success: false, error: "consent required" });
  if (!ageConfirmed) return res.json({ success: false, error: "18+" });
  if (rateLimit(ip)) return res.json({ success: false, error: "too many attempts" });
  if (!phone || !phone.match(/^\+380\d{9}$/))
    return res.json({ success: false, error: "invalid phone" });
  if (users[phone])
    return res.json({ success: false, error: "already used" });

  const code = generateCode();
  smsStore[phone] = code;

  console.log("SMS:", phone, code);

  setTimeout(() => {
    if (smsStore[phone] === code) delete smsStore[phone];
  }, 5 * 60 * 1000);

  res.json({ success: true });
});

/* ---------------- VERIFY ---------------- */
app.post("/verify-code", (req, res) => {
  const { phone, code } = req.body;

  if (!smsStore[phone])
    return res.json({ success: false, error: "expired" });

  if (smsStore[phone] !== code)
    return res.json({ success: false, error: "wrong code" });

  const promo = generatePromo();

  users[phone] = true;
  delete smsStore[phone];

  res.json({ success: true, promo });
});

/* ---------------- START ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});
