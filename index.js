const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 раздаём файлы из корня (banner.jpg рядом с index.js)
app.use(express.static(__dirname));

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
   🎮 GAME PAGE (LANDING STYLE)
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
  background:linear-gradient(180deg,#000,#020617);
  color:#fff;
  text-align:center;
}

.banner{
  width:100%;
  height:260px;
  object-fit:cover;
  filter:brightness(0.7);
}

#question{
  font-size:26px;
  font-weight:700;
  margin:20px;
}

#timer{
  font-size:40px;
  margin:10px;
}

.danger{
  color:red;
  animation:blink .5s infinite;
}
@keyframes blink{50%{opacity:0.3}}

.row{
  display:flex;
  justify-content:center;
  gap:12px;
  margin:30px;
}

.cell{
  width:55px;
  height:55px;
  border-radius:8px;
  border:2px solid #333;
  background:#111;
  font-size:26px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.correct{background:#39FF14;color:#000;}
.wrong{background:#ff3b3b;}

input{
  padding:14px;
  font-size:18px;
  border-radius:10px;
  border:none;
  width:260px;
}

button{
  padding:14px 28px;
  background:#39FF14;
  border:none;
  border-radius:30px;
  font-weight:bold;
  cursor:pointer;
  margin-top:10px;
}

#phone{display:none;margin-top:20px}
#win{font-size:28px;margin-top:20px}
</style>
</head>

<body>

<img class="banner" src="/banner.jpg"/>

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
    setTimeout(()=>alert("❌ Неправильно"),1200);
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

  const r=await fetch("/send-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone})
  });

  const d=await r.json();

  if(d.success){
    document.getElementById("codeBlock").style.display="block";
  } else {
    alert(d.error);
  }
}

async function verify(){
  const phone=document.getElementById("ph").value;
  const code=document.getElementById("cd").value;

  const r=await fetch("/verify-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone,code})
  });

  const d=await r.json();

  if(d.success){
    document.getElementById("win").innerText="🎉 Ваш код: "+d.promo;
  } else {
    alert(d.error || "Помилка");
  }
}

start();
</script>

</body>
</html>`);
});

/* =========================================================
   📊 ADMIN (SaaS)
========================================================= */
app.get("/admin",(req,res)=>{
  const users=db.prepare("SELECT rowid as id,* FROM users ORDER BY rowid DESC").all();

  res.send(`
  <h2>Admin Panel</h2>
  <p>Total users: ${users.length}</p>
  <table border="1" cellpadding="10">
  <tr><th>ID</th><th>Phone</th><th>Promo</th></tr>
  ${users.map(u=>\`<tr><td>\${u.id}</td><td>\${u.phone}</td><td>\${u.promo}</td></tr>\`).join("")}
  </table>
  <br><a href="/export">⬇ Export CSV</a>
  `);
});

/* ---------- API ---------- */
app.get("/export",(req,res)=>{
  const users=db.prepare("SELECT * FROM users").all();
  const csv=["phone,promo",...users.map(u=>u.phone+","+u.promo)].join("\\n");
  res.setHeader("Content-Type","text/csv");
  res.send(csv);
});

app.post("/send-code",(req,res)=>{
  const {phone}=req.body;

  if(!phone) return res.json({success:false,error:"Введіть номер"});

  const code=genCode();

  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes VALUES (?,?,?)")
    .run(phone,code,Date.now()+300000);

  console.log("SMS:",phone,code);

  res.json({success:true});
});

app.post("/verify-code",(req,res)=>{
  const {phone,code}=req.body;

  const row=db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);

  if(!row) return res.json({success:false,error:"Код не знайдено"});

  if(Date.now()>row.expires)
    return res.json({success:false,error:"Код прострочений"});

  if(row.code!==code)
    return res.json({success:false,error:"Невірний код"});

  const promo=genPromo();

  db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)")
    .run(phone,promo);

  res.json({success:true,promo});
});

/* ---------- START ---------- */
app.listen(PORT,"0.0.0.0",()=>console.log("RUNNING",PORT));
  
