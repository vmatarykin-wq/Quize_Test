const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Render PORT
const PORT = process.env.PORT || 3000;

/* ------------------ SECURITY / BASIC HEADERS ------------------ */
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

/* ------------------ STORAGE ------------------ */
const smsStore = {};
const users = {};
const ipStore = {};

/* ------------------ HELPERS ------------------ */
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

function isRateLimited(ip) {
  const now = Date.now();
  if (!ipStore[ip]) ipStore[ip] = [];

  ipStore[ip] = ipStore[ip].filter(t => now - t < 10 * 60 * 1000);

  if (ipStore[ip].length >= 5) return true;

  ipStore[ip].push(now);
  return false;
}

/* ------------------ HEALTH CHECK (IMPORTANT FOR RENDER) ------------------ */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ------------------ MAIN ------------------ */
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

/* ------------------ CAMPAIGN INFO ------------------ */
app.get("/campaign-info", (req, res) => {
  res.json({
    title: "АКЦІЯ PARALLEL до 31-річчя!",
    prizes: [
      "1000$ на паливо",
      "20л пального (10 призів)",
      "10л (20 призів)",
      "50 кав",
      "100 хот-догів"
    ],
    rules: "Повністю правильний тест → SMS → промокод"
  });
});

/* ------------------ SEND CODE ------------------ */
app.post("/send-code", (req, res) => {
  const { phone, consent, ageConfirmed } = req.body;
  const ip = getIP(req);

  if (!consent)
    return res.json({ success: false, error: "Потрібна згода" });

  if (!ageConfirmed)
    return res.json({ success: false, error: "18+" });

  if (isRateLimited(ip))
    return res.json({ success: false, error: "Забагато спроб" });

  if (!phone || !phone.match(/^\+380\d{9}$/))
    return res.json({ success: false, error: "Невірний номер" });

  if (users[phone])
    return res.json({ success: false, error: "Ви вже брали участь" });

  const code = generateCode();
  smsStore[phone] = code;

  console.log("SMS CODE:", phone, code);

  setTimeout(() => {
    if (smsStore[phone] === code) delete smsStore[phone];
  }, 5 * 60 * 1000);

  res.json({ success: true });
});

/* ------------------ VERIFY CODE ------------------ */
app.post("/verify-code", (req, res) => {
  const { phone, code } = req.body;

  if (!smsStore[phone])
    return res.json({ success: false, error: "Код прострочений" });

  if (smsStore[phone] !== code)
    return res.json({ success: false, error: "Невірний код" });

  const promo = generatePromo();

  users[phone] = true;
  delete smsStore[phone];

  console.log("NEW USER:", phone, promo);

  res.json({ success: true, promo });
});

/* ------------------ START SERVER (RENDER SAFE) ------------------ */
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port " + PORT);
});
