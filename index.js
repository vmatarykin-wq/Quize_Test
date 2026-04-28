const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ---------------- DATABASE ---------------- */
const db = new Database("db.sqlite");

// таблицы
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE,
  promo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS codes (
  phone TEXT,
  code TEXT,
  expires INTEGER
)
`).run();

/* ---------------- HELPERS ---------------- */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ---------------- HEALTH ---------------- */
app.get("/health", (req, res) => res.send("OK"));

/* ---------------- MAIN PAGE ---------------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>WOW Crossword</title>

<style>
body{
  margin:0;
  font-family:Arial;
  background:#020402;
  color:#39FF14;
  text-align:center;
}

h1{margin-top:20px}

.grid{
  display:grid;
  grid-template-columns:repeat(7,60px);
  gap:8px;
  justify-content:center;
  margin-top:30px;
}

.cell{
  width:60px;
  height:60px;
  border:2px solid #39FF14;
  border-radius:10px;
  transition:0.2s;
}

.cell input{
  width:100%;
  height:100%;
  background:transparent;
  border:none;
  color:#39FF14;
  font-size:28px;
  text-align:center;
}

.correct{background:#0f2f0f}
.wrong{background:#3a0f0f;border-color:red}

.fade{
  animation:fade 0.3s ease;
}
@keyframes fade{
  from{transform:scale(1.2)}
  to{transform:scale(1)}
}

button{
  margin-top:20px;
  padding:12px 25px;
  background:#39FF14;
  border:none;
  font-weight:bold;
  border-radius:20px;
  cursor:pointer;
}

#phoneBlock{display:none;margin-top:20px}
#promo{font-size:30px;margin-top:20px}
</style>
</head>

<body>

<h1>PARALLEL WOW CROSSWORD</h1>

<div class="grid" id="grid"></div>

<button onclick="check()">Перевірити</button>

<div id="phoneBlock">
  <input id="phone" placeholder="+380XXXXXXXXX"><br><br>
  <button onclick="sendCode()">Отримати код</button>

  <div id="codeBlock" style="display:none">
    <input id="code" placeholder="Код"><br><br>
    <button onclick="verify()">Підтвердити</button>
  </div>
</div>

<div id="promo"></div>

<script>
const answer = ["З","Е","Л","Е","Н","И","Й"];
const grid = document.getElementById("grid");

answer.forEach(() => {
  const cell = document.createElement("div");
  cell.className = "cell";

  const input = document.createElement("input");
  input.maxLength = 1;

  input.oninput = () => {
    input.value = input.value.toUpperCase();
    cell.classList.remove("wrong","correct");
  };

  cell.appendChild(input);
  grid.appendChild(cell);
});

function check(){
  const cells = document.querySelectorAll(".cell");
  let ok = true;

  cells.forEach((c, i) => {
    const val = c.querySelector("input").value;

    c.classList.add("fade");

    if(val === answer[i]){
      c.classList.add("correct");
    } else {
      c.classList.add("wrong");
      ok = false;
    }

    setTimeout(()=>c.classList.remove("fade"),300);
  });

  if(ok){
    document.getElementById("phoneBlock").style.display="block";
    window.scrollTo(0,document.body.scrollHeight);
  }
}

async function sendCode(){
  const phone = document.getElementById("phone").value;

  const r = await fetch("/send-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone})
  });

  const d = await r.json();

  if(d.success){
    alert("Код відправлено");
    document.getElementById("codeBlock").style.display="block";
  } else alert(d.error);
}

async function verify(){
  const phone = document.getElementById("phone").value;
  const code = document.getElementById("code").value;

  const r = await fetch("/verify-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone,code})
  });

  const d = await r.json();

  if(d.success){
    document.getElementById("promo").innerText = d.promo;
  } else alert(d.error);
}
</script>

</body>
</html>
  `);
});

/* ---------------- API ---------------- */
app.post("/send-code",(req,res)=>{
  const { phone } = req.body;

  if(!phone) return res.json({success:false,error:"no phone"});

  const code = generateCode();

  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes (phone, code, expires) VALUES (?,?,?)")
    .run(phone, code, Date.now() + 5*60*1000);

  console.log("SMS:", phone, code);

  res.json({success:true});
});

app.post("/verify-code",(req,res)=>{
  const { phone, code } = req.body;

  const row = db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);

  if(!row) return res.json({success:false,error:"no code"});
  if(row.code !== code) return res.json({success:false,error:"wrong"});
  if(row.expires < Date.now()) return res.json({success:false,error:"expired"});

  const promo = generatePromo();

  db.prepare("INSERT OR IGNORE INTO users (phone,promo) VALUES (?,?)")
    .run(phone, promo);

  res.json({success:true,promo});
});

/* ---------------- START ---------------- */
app.listen(PORT,"0.0.0.0",()=>{
  console.log("WOW DB SERVER:",PORT);
});
