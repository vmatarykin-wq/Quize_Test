const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ---------------- ENTERPRISE HEADERS ---------------- */
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

/* ---------------- MEMORY STORE (replace later with Redis) ---------------- */
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

/* ---------------- HEALTH CHECK (RENDER CRITICAL) ---------------- */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ---------------- API ---------------- */
app.post("/send-code", (req, res) => {
  const { phone, consent, ageConfirmed } = req.body;
  const ip = getIP(req);

  if (!consent) return res.json({ success: false, error: "consent required" });
  if (!ageConfirmed) return res.json({ success: false, error: "18+" });
  if (rateLimit(ip)) return res.json({ success: false, error: "rate limit" });
  if (!phone || !phone.match(/^\+380\d{9}$/))
    return res.json({ success: false, error: "invalid phone" });
  if (users[phone])
    return res.json({ success: false, error: "already used" });

  const code = generateCode();
  smsStore[phone] = code;

  console.log("[SMS]", phone, code);

  setTimeout(() => {
    if (smsStore[phone] === code) delete smsStore[phone];
  }, 5 * 60 * 1000);

  res.json({ success: true });
});

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

/* ---------------- ENTERPRISE CROSSWORD FRONTEND ---------------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<title>PARALLEL ENTERPRISE CROSSWORD</title>
<style>
body {
  margin:0;
  font-family: Arial;
  background:#050805;
  color:#39FF14;
  text-align:center;
}

h1 { margin-top:20px; }

.grid {
  display:grid;
  grid-template-columns: repeat(6, 55px);
  gap:6px;
  justify-content:center;
  margin-top:30px;
}

input {
  width:55px;
  height:55px;
  font-size:26px;
  text-align:center;
  background:#111;
  color:#39FF14;
  border:1px solid #39FF14;
  border-radius:8px;
  text-transform:uppercase;
}

button {
  margin-top:25px;
  padding:12px 25px;
  background:#39FF14;
  border:none;
  cursor:pointer;
  font-weight:bold;
  border-radius:20px;
}

.panel {
  margin-top:20px;
}
</style>
</head>
<body>

<h1>PARALLEL ENTERPRISE CROSSWORD</h1>
<p>Введи слово: ЗЕЛЕНИЙ</p>

<div class="grid" id="grid"></div>

<button onclick="check()">Перевірити</button>

<div class="panel" id="result"></div>

<script>
const answer = ["З","Е","Л","Е","Н","И","Й"];

const grid = document.getElementById("grid");

answer.forEach(() => {
  const i = document.createElement("input");
  i.maxLength = 1;
  i.oninput = () => i.value = i.value.toUpperCase();
  grid.appendChild(i);
});

function check() {
  const inputs = document.querySelectorAll("input");
  let ok = true;

  inputs.forEach((i, idx) => {
    if(i.value !== answer[idx]) ok = false;
  });

  document.getElementById("result").innerText =
    ok ? "WIN ✅ (готово для SMS этапа)" : "TRY AGAIN ❌";
}
</script>

</body>
</html>
  `);
});

/* ---------------- START (RENDER SAFE) ---------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log("ENTERPRISE SERVER RUNNING ON " + PORT);
});
