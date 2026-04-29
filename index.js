const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/assets", express.static(path.join(__dirname, "public")));

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
const genCode = () => Math.floor(100000 + Math.random()*900000).toString();
const genPromo = () => "PWR-" + Math.random().toString(36).substring(2,8).toUpperCase();

/* =========================================================
   🎮 GAME PAGE
========================================================= */
app.get("/", (req, res) => {
res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Parallel Quiz</title>

<style>
body{
  margin:0;
  font-family:Arial;
  background:#000;
  color:#fff;
  text-align:center;
}

/* banner */
.banner{
  width:100%;
  max-height:220px;
  object-fit:cover;
}

/* question */
#question{
  font-size:22px;
  margin:15px;
}

/* timer */
#timer{
  font-size:32px;
  color:#ffcc00;
}
.danger{
  color:red;
  animation:blink .5s infinite;
}
@keyframes blink{50%{opacity:0.3}}

/* grid */
.row{
  display:flex;
  justify-content:center;
  gap:10px;
  margin:20px;
}

.cell{
  width:50px;
  height:50px;
  border:2px solid #444;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  background:#111;
}

.correct{background:#00cc66}
.wrong{background:#cc3333}

/* controls */
input{
  padding:10px;
  font-size:18px;
  text-align:center;
}
button{
  padding:10px 20px;
  background:#39FF14;
  border:none;
  margin-top:10px;
}

/* win */
#win{
  font-size:28px;
  margin-top:20px;
}

/* phone */
#phone{display:none;margin-top:20px}
</style>
</head>

<body>

<img class="banner" src="/assets/banner.jpg"/>

<h2 id="question"></h2>
<div id="timer"></div>

<div class="row" id="row"></div>

<input id="input" placeholder="Введіть відповідь">
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
  {q:"Фірмовий колір АЗК Parallel", a:"ЗЕЛЕНИЙ"},
  {q:"Бізнес-група, що заснувала мережу Parallel", a:"СКМ"},
  {q:"Найбільше місто за кількістю АЗК Parallel", a:"КИЇВ"},
  {q:"Прізвище власника мережі Parallel", a:"ДУБІНІН"},
  {q:"Геометрична фігура в логотипі Parallel", a:"КВАДРАТ"},
  {q:"Найзапашніше на АЗК Parallel", a:"КАВА"},
  {q:"Найпопулярніший засіб проти голоду на АЗК Parallel", a:"ХОТДОГ"}
];

let current=0,time=10,timer;

/* elements */
const q=document.getElementById("question");
const row=document.getElementById("row");
const timerEl=document.getElementById("timer");

function start(){
  const cur=QUESTIONS[current];
  q.innerText=cur.q;
  row.innerHTML="";

  cur.a.split("").forEach(()=>{
    const c=document.createElement("div");
    c.className="cell";
    row.appendChild(c);
  });

  runTimer();
}

function runTimer(){
  time=10;
  timerEl.innerText=time;
  timerEl.classList.remove("danger");

  clearInterval(timer);
  timer=setInterval(()=>{
    time--;
    timerEl.innerText=time;

    if(time<=3) timerEl.classList.add("danger");

    if(time===0){
      clearInterval(timer);
      alert("⏱ Час вийшов");
      location.reload();
    }
  },1000);
}

function submit(){
  clearInterval(timer);

  const val=document.getElementById("input").value.toUpperCase();
  const ans=QUESTIONS[current].a;
  const cells=row.children;

  for(let i=0;i<ans.length;i++){
    setTimeout(()=>{
      cells[i].innerText=ans[i];
      if(val[i]===ans[i]) cells[i].classList.add("correct");
      else cells[i].classList.add("wrong");
    },i*200);
  }

  if(val===ans){
    setTimeout(next,1200);
  } else {
    setTimeout(()=>location.reload(),1200);
  }
}

function next(){
  current++;
  document.getElementById("input").value="";
  if(current>=QUESTIONS.length) win();
  else start();
}

function win(){
  document.getElementById("win").innerText="🎉 ПЕРЕМОГА!";
  document.getElementById("phone").style.display="block";
}

/* SMS */
async function send(){
  const phone=document.getElementById("ph").value;
  const r=await fetch("/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
  const d=await r.json();
  if(d.success) document.getElementById("codeBlock").style.display="block";
}

async function verify(){
  const phone=document.getElementById("ph").value;
  const code=document.getElementById("cd").value;

  const r=await fetch("/verify-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,code})});
  const d=await r.json();

  if(d.success){
    document.getElementById("win").innerText="🎉 "+d.promo;
  }
}

start();
</script>

</body>
</html>`);
});

/* =========================================================
   📊 SAAS ADMIN
========================================================= */
app.get("/admin", (req, res) => {
res.send(`
<html>
<head>
<style>
body{background:#0f172a;color:white;font-family:Arial}
.header{padding:20px;background:#020617;display:flex;justify-content:space-between}
.card{background:#111827;padding:20px;margin:20px;border-radius:10px}
table{width:100%;border-collapse:collapse}
td,th{padding:10px;border-bottom:1px solid #333}
</style>
</head>
<body>

<div class="header">
<h2>ADMIN PANEL</h2>
<button onclick="exportCSV()">Export CSV</button>
</div>

<div class="card">
<h3>Users: <span id="total">0</span></h3>
</div>

<div class="card">
<input id="search" placeholder="Search phone..." oninput="render()">
<table>
<thead><tr><th>ID</th><th>Phone</th><th>Promo</th></tr></thead>
<tbody id="tb"></tbody>
</table>
</div>

<script>
let users=[];

async function load(){
  users=await fetch("/api/users").then(r=>r.json());
  document.getElementById("total").innerText=users.length;
  render();
}

function render(){
  const q=document.getElementById("search").value;
  document.getElementById("tb").innerHTML=
    users.filter(u=>u.phone.includes(q)).map((u,i)=>\`
    <tr><td>\${i+1}</td><td>\${u.phone}</td><td>\${u.promo}</td></tr>
    \`).join("");
}

function exportCSV(){window.location="/export"}

setInterval(load,3000);
load();
</script>

</body>
</html>
`);
});

/* ---------- API ---------- */
app.get("/api/users",(req,res)=>{
  res.json(db.prepare("SELECT * FROM users").all());
});

app.get("/export",(req,res)=>{
  const users=db.prepare("SELECT * FROM users").all();
  const csv=["phone,promo",...users.map(u=>u.phone+","+u.promo)].join("\\n");
  res.setHeader("Content-Type","text/csv");
  res.send(csv);
});

app.post("/send-code",(req,res)=>{
  const {phone}=req.body;
  const code=genCode();

  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes VALUES (?,?,?)").run(phone,code,Date.now()+300000);

  console.log("SMS:",phone,code);
  res.json({success:true});
});

app.post("/verify-code",(req,res)=>{
  const {phone,code}=req.body;
  const row=db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);

  if(!row||row.code!==code) return res.json({success:false});

  const promo=genPromo();
  db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)").run(phone,promo);

  res.json({success:true,promo});
});

app.listen(PORT,"0.0.0.0",()=>console.log("RUNNING",PORT));
