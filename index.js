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
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genPromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ---------- FRONT (TV GAME) ---------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Parallel Show</title>

<style>
body{
  margin:0;
  background:#000;
  color:white;
  font-family:Arial;
  display:flex;
  flex-direction:column;
  align-items:center;
}

/* TITLE */
h1{
  margin:20px;
  color:#39FF14;
  letter-spacing:2px;
}

/* QUESTION */
#question{
  font-size:22px;
  text-align:center;
  margin:10px;
  max-width:320px;
  min-height:60px;
}

/* TIMER */
#timer{
  font-size:32px;
  margin:10px;
  color:#ffcc00;
}

/* ROW */
.row{
  display:flex;
  gap:8px;
  margin:20px;
}

.cell{
  width:52px;
  height:52px;
  border:2px solid #444;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  background:#111;
}

/* reveal animation */
.reveal{
  animation:reveal 0.3s ease;
}

@keyframes reveal{
  0%{transform:scale(0)}
  100%{transform:scale(1)}
}

.correct{background:#00cc66}
.wrong{background:#cc3333}

/* INPUT */
input{
  margin-top:15px;
  padding:10px;
  font-size:18px;
  text-align:center;
}

/* BUTTON */
button{
  margin-top:10px;
  padding:10px 20px;
  background:#39FF14;
  border:none;
  cursor:pointer;
}

/* WIN */
#win{
  display:none;
  margin-top:20px;
  font-size:26px;
}

/* PHONE */
#phone{
  display:none;
  margin-top:20px;
}
</style>
</head>

<body>

<h1>PARALLEL SHOW</h1>

<div id="question"></div>
<div id="timer"></div>

<div class="row" id="row"></div>

<input id="input" placeholder="Введи відповідь">
<br>
<button onclick="submit()">OK</button>

<div id="win"></div>

<div id="phone">
  <input id="ph" placeholder="+380XXXXXXXXX"><br>
  <button onclick="send()">Отримати код</button>

  <div id="codeBlock" style="display:none">
    <input id="cd" placeholder="код"><br>
    <button onclick="verify()">OK</button>
  </div>
</div>

<script>
const QUESTIONS = [
  {q:"Фірмовий колір", a:"ЗЕЛЕНИЙ"},
  {q:"Засновник", a:"СКМ"},
  {q:"Місто №1", a:"КИЇВ"},
  {q:"Власник", a:"ДУБІНІН"},
  {q:"Фігура логотипу", a:"КВАДРАТ"},
  {q:"Напій №1", a:"КАВА"},
  {q:"Їжа №1", a:"ХОТДОГ"}
];

let current = 0;
let time = 10;
let timerInterval;

const qDiv = document.getElementById("question");
const rowDiv = document.getElementById("row");
const timerDiv = document.getElementById("timer");

/* ---------- START QUESTION ---------- */
function startQuestion(){
  const q = QUESTIONS[current];

  qDiv.innerText = q.q;
  rowDiv.innerHTML = "";

  q.a.split("").forEach(()=>{
    const c = document.createElement("div");
    c.className="cell";
    rowDiv.appendChild(c);
  });

  startTimer();
}

/* ---------- TIMER ---------- */
function startTimer(){
  time = 10;
  timerDiv.innerText = time;

  clearInterval(timerInterval);

  timerInterval = setInterval(()=>{
    time--;
    timerDiv.innerText = time;

    if(time === 0){
      clearInterval(timerInterval);
      fail();
    }
  },1000);
}

/* ---------- SUBMIT ---------- */
function submit(){
  clearInterval(timerInterval);

  const val = document.getElementById("input").value.toUpperCase();
  const ans = QUESTIONS[current].a;
  const cells = rowDiv.children;

  for(let i=0;i<ans.length;i++){
    setTimeout(()=>{
      cells[i].innerText = ans[i];
      cells[i].classList.add("reveal");

      if(val[i] === ans[i]){
        cells[i].classList.add("correct");
      } else {
        cells[i].classList.add("wrong");
      }
    }, i*200);
  }

  if(val === ans){
    setTimeout(next, ans.length * 200 + 500);
  } else {
    setTimeout(fail, ans.length * 200 + 500);
  }
}

/* ---------- NEXT ---------- */
function next(){
  current++;
  document.getElementById("input").value = "";

  if(current >= QUESTIONS.length){
    win();
  } else {
    startQuestion();
  }
}

/* ---------- FAIL ---------- */
function fail(){
  alert("❌ Неправильно");
  location.reload();
}

/* ---------- WIN ---------- */
function win(){
  document.getElementById("win").style.display="block";
  document.getElementById("win").innerText = "🎉 ПЕРЕМОГА!";

  document.getElementById("phone").style.display="block";
}

/* ---------- SMS ---------- */
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
    document.getElementById("win").innerText = "🎉 " + d.promo;
  }
}

/* ---------- START ---------- */
startQuestion();
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

/* ---------- START SERVER ---------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log("TV SHOW RUNNING ON PORT:", PORT);
});
