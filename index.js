const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ---------- DB ---------- */
const db = new Database("db.sqlite");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  phone TEXT UNIQUE,
  promo TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS codes (
  phone TEXT,
  code TEXT,
  expires INTEGER
)
`).run();

/* ---------- HELPERS ---------- */
const WORD = "ЗЕЛЕНИЙ";

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genPromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ---------- PAGE ---------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Parallel Wordle</title>

<style>
body{
  background:#121213;
  color:white;
  font-family:Arial;
  text-align:center;
}

h1{
  color:#39FF14;
  margin-top:20px;
}

.grid{
  display:grid;
  gap:6px;
  margin-top:20px;
  justify-content:center;
}

.row{
  display:grid;
  grid-template-columns:repeat(7,50px);
  gap:6px;
}

.cell{
  width:50px;
  height:50px;
  border:2px solid #3a3a3c;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  font-weight:bold;
  text-transform:uppercase;
  background:#121213;
}

.flip{
  animation:flip 0.5s;
}

@keyframes flip{
  0%{transform:rotateX(0)}
  50%{transform:rotateX(90deg)}
  100%{transform:rotateX(0)}
}

.green{background:#6aaa64;border:none}
.yellow{background:#c9b458;border:none}
.gray{background:#3a3a3c;border:none}

/* keyboard */
.keyboard{
  margin-top:30px;
}

.key{
  display:inline-block;
  margin:3px;
  padding:10px 14px;
  background:#818384;
  border-radius:6px;
  cursor:pointer;
  font-weight:bold;
}

.big{padding:10px 20px}

/* phone */
#phone{display:none;margin-top:20px}
input{
  padding:10px;
  text-align:center;
}
button{
  margin-top:10px;
  padding:10px 20px;
  background:#39FF14;
  border:none;
}
</style>

</head>

<body>

<h1>PARALLEL WORDLE</h1>

<div class="grid" id="grid"></div>

<div class="keyboard" id="kb"></div>

<div id="phone">
  <input id="ph" placeholder="+380XXXXXXXXX"><br>
  <button onclick="send()">Отримати код</button>

  <div id="codeBlock" style="display:none">
    <input id="cd" placeholder="код"><br>
    <button onclick="verify()">OK</button>
  </div>
</div>

<h2 id="promo"></h2>

<script>
const WORD = "${WORD}";
let row = 0;
let col = 0;
let gameOver = false;

const grid = document.getElementById("grid");

/* create grid */
for(let i=0;i<6;i++){
  const r = document.createElement("div");
  r.className="row";

  for(let j=0;j<7;j++){
    const c = document.createElement("div");
    c.className="cell";
    r.appendChild(c);
  }

  grid.appendChild(r);
}

/* keyboard */
const letters = "ЙЦУКЕНГШЩЗХФІВАПРОЛДЖЄЯЧСМИТЬБЮ".split("");
const kb = document.getElementById("kb");

letters.forEach(l=>{
  const k = document.createElement("div");
  k.className="key";
  k.innerText=l;
  k.onclick=()=>press(l);
  kb.appendChild(k);
});

const enter = document.createElement("div");
enter.className="key big";
enter.innerText="ENTER";
enter.onclick=submit;
kb.appendChild(enter);

const back = document.createElement("div");
back.className="key big";
back.innerText="⌫";
back.onclick=backspace;
kb.appendChild(back);

/* input logic */
function press(l){
  if(gameOver || col>=7) return;
  const cell = grid.children[row].children[col];
  cell.innerText = l;
  col++;
}

function backspace(){
  if(col<=0) return;
  col--;
  grid.children[row].children[col].innerText="";
}

function submit(){
  if(col < 7) return;

  const cells = grid.children[row].children;
  let val = "";

  for(let i=0;i<7;i++){
    val += cells[i].innerText;
  }

  let used = WORD.split("");

  for(let i=0;i<7;i++){
    setTimeout(()=>{
      cells[i].classList.add("flip");

      if(val[i] === WORD[i]){
        cells[i].classList.add("green");
        used[i]=null;
      } else {
        const idx = used.indexOf(val[i]);
        if(idx !== -1){
          cells[i].classList.add("yellow");
          used[idx]=null;
        } else {
          cells[i].classList.add("gray");
        }
      }

    }, i*300);
  }

  if(val === WORD){
    gameOver = true;
    setTimeout(()=>{
      document.getElementById("phone").style.display="block";
    },2000);
    return;
  }

  row++;
  col=0;

  if(row===6){
    gameOver = true;
    alert("Спробуй ще раз");
  }
}

/* keyboard input */
document.addEventListener("keydown",(e)=>{
  if(gameOver) return;

  if(e.key==="Enter") submit();
  else if(e.key==="Backspace") backspace();
  else{
    const letter = e.key.toUpperCase();
    if(letter.match(/[А-ЯІЇЄҐ]/)){
      press(letter);
    }
  }
});

/* SMS */
async function send(){
  const phone = document.getElementById("ph").value;

  const r = await fetch("/send-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone})
  });

  const d = await r.json();

  if(d.success){
    document.getElementById("codeBlock").style.display="block";
  }
}

async function verify(){
  const phone = document.getElementById("ph").value;
  const code = document.getElementById("cd").value;

  const r = await fetch("/verify-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone,code})
  });

  const d = await r.json();

  if(d.success){
    document.getElementById("promo").innerText = d.promo;
  }
}
</script>

</body>
</html>
`);
});

/* ---------- API ---------- */
app.post("/send-code",(req,res)=>{
  const { phone } = req.body;

  const code = genCode();

  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes VALUES (?,?,?)")
    .run(phone, code, Date.now()+300000);

  console.log("SMS:", phone, code);

  res.json({success:true});
});

app.post("/verify-code",(req,res)=>{
  const { phone, code } = req.body;

  const row = db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);

  if(!row || row.code !== code) return res.json({success:false});

  const promo = genPromo();

  db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)")
    .run(phone, promo);

  res.json({success:true,promo});
});

/* ---------- START ---------- */
app.listen(PORT,"0.0.0.0",()=>{
  console.log("FINAL WORDLE RUNNING:",PORT);
});
