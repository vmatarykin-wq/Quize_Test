const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // banner.jpg тут

const PORT = process.env.PORT || 3000;

/* ================= DB ================= */
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

const genCode = () => Math.floor(100000 + Math.random()*900000).toString();
const genPromo = () => "PWR-" + Math.random().toString(36).substring(2,8).toUpperCase();

/* ================= GAME ================= */
app.get("/", (req,res)=>{
res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Parallel Promo</title>

<style>
body{
  margin:0;
  font-family:Arial;
  background:#000;
  color:#fff;
  text-align:center;
  overflow:hidden;
}

/* background */
.bg{
  position:fixed;
  top:0;left:0;width:100%;height:100%;
  background:url('/banner.jpg') center/cover no-repeat;
  filter:brightness(0.4);
  z-index:-1;
}

/* overlay */
.overlay{
  position:absolute;
  width:100%;
  top:0;
  padding:20px;
}

/* title */
.title{
  font-size:28px;
  font-weight:800;
  color:#39FF14;
  text-shadow:0 0 20px #39FF14;
}

/* question */
#question{
  font-size:24px;
  margin:20px;
}

/* timer */
#timer{
  font-size:48px;
  color:#fff;
}
.danger{color:red}

/* grid */
.row{
  display:flex;
  justify-content:center;
  gap:10px;
  margin:20px;
}
.cell{
  width:60px;
  height:60px;
  border:2px solid #444;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:26px;
  background:#111;
  transition:.3s;
}
.correct{background:#39FF14;color:#000}
.wrong{background:#ff3b3b}

/* controls */
input{
  padding:14px;
  font-size:18px;
  border-radius:10px;
  border:none;
  width:260px;
}
button{
  padding:14px 30px;
  background:#39FF14;
  border:none;
  border-radius:30px;
  font-weight:bold;
  margin-top:10px;
}

/* win */
#win{font-size:32px;margin-top:20px}

/* phone */
#phone{display:none}

/* pulse */
.pulse{
  animation:pulse 1s infinite;
}
@keyframes pulse{
  0%{transform:scale(1)}
  50%{transform:scale(1.05)}
  100%{transform:scale(1)}
}
</style>
</head>

<body>

<div class="bg"></div>

<div class="overlay">

<div class="title">PARALLEL PROMO GAME</div>

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
    <button onclick="verify()">Підтвердити</button>
  </div>
</div>

</div>

<!-- sounds -->
<audio id="ok" src="https://actions.google.com/sounds/v1/cartoon/pop.ogg"></audio>
<audio id="fail" src="https://actions.google.com/sounds/v1/cartoon/boing.ogg"></audio>
<audio id="winSound" src="https://actions.google.com/sounds/v1/crowds/cheer.ogg"></audio>

<script>
const QUESTIONS=[
{q:"Фірмовий колір АЗК Parallel",a:"ЗЕЛЕНИЙ"},
{q:"Бізнес-група",a:"СКМ"},
{q:"Місто №1",a:"КИЇВ"},
{q:"Власник",a:"ДУБІНІН"},
{q:"Фігура логотипу",a:"КВАДРАТ"},
{q:"Запах",a:"КАВА"},
{q:"Проти голоду",a:"ХОТДОГ"}
];

let i=0,time=10,t;

function start(){
  document.getElementById("question").innerText=QUESTIONS[i].q;
  const row=document.getElementById("row");
  row.innerHTML="";
  QUESTIONS[i].a.split("").forEach(()=>{
    const c=document.createElement("div");
    c.className="cell";
    row.appendChild(c);
  });
  runTimer();
}

function runTimer(){
  time=10;
  const el=document.getElementById("timer");
  clearInterval(t);
  t=setInterval(()=>{
    time--;
    el.innerText=time;
    if(time<4) el.classList.add("danger");
    if(time===0){
      document.getElementById("fail").play();
      alert("Час вийшов");
      location.reload();
    }
  },1000);
}

function submit(){
  clearInterval(t);
  const val=document.getElementById("input").value.toUpperCase();
  const ans=QUESTIONS[i].a;
  const cells=document.getElementById("row").children;

  for(let x=0;x<ans.length;x++){
    setTimeout(()=>{
      cells[x].innerText=ans[x];
      if(val[x]===ans[x]){
        cells[x].classList.add("correct");
        document.getElementById("ok").play();
      } else {
        cells[x].classList.add("wrong");
        document.getElementById("fail").play();
      }
    },x*200);
  }

  if(val===ans){
    setTimeout(()=>{i++;next();},1200);
  } else {
    setTimeout(()=>location.reload(),1500);
  }
}

function next(){
  document.getElementById("input").value="";
  if(i>=QUESTIONS.length){
    document.getElementById("win").innerText="🎉 ПЕРЕМОГА!";
    document.getElementById("winSound").play();
    document.getElementById("phone").style.display="block";
  } else start();
}

/* SMS */
async function send(){
  const phone=document.getElementById("ph").value;
  const r=await fetch("/send-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone})});
  const d=await r.json();

  if(d.success){
    alert("Ваш код: "+d.debugCode);
    document.getElementById("codeBlock").style.display="block";
  }
}

async function verify(){
  const phone=document.getElementById("ph").value;
  const code=document.getElementById("cd").value;

  const r=await fetch("/verify-code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,code})});
  const d=await r.json();

  if(d.success){
    document.getElementById("win").innerText="🎉 "+d.promo;
  } else alert(d.error);
}

start();
</script>

</body>
</html>`);
});

/* ================= API ================= */

app.post("/send-code",(req,res)=>{
  const {phone}=req.body;
  const code=genCode();

  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes VALUES (?,?,?)")
    .run(phone,code,Date.now()+300000);

  console.log("SMS:",phone,code);

  res.json({success:true,debugCode:code});
});

app.post("/verify-code",(req,res)=>{
  const {phone,code}=req.body;

  const row=db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);

  if(!row) return res.json({success:false,error:"Код не знайдено"});
  if(Date.now()>row.expires) return res.json({success:false,error:"Код прострочений"});
  if(row.code!==code) return res.json({success:false,error:"Невірний код"});

  const promo=genPromo();
  db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)").run(phone,promo);

  res.json({success:true,promo});
});

/* ================= ADMIN ================= */

app.get("/admin",(req,res)=>{
  const users=db.prepare("SELECT * FROM users").all();

  res.send(\`
  <h1>Users: \${users.length}</h1>
  <table border="1" cellpadding="10">
  <tr><th>Phone</th><th>Promo</th></tr>
  \${users.map(u=>\`<tr><td>\${u.phone}</td><td>\${u.promo}</td></tr>\`).join("")}
  </table>
  <br><a href="/export">Export CSV</a>
  \`);
});

app.get("/export",(req,res)=>{
  const users=db.prepare("SELECT * FROM users").all();
  const csv=["phone,promo",...users.map(u=>u.phone+","+u.promo)].join("\\n");
  res.setHeader("Content-Type","text/csv");
  res.send(csv);
});

/* ================= START ================= */
app.listen(PORT,"0.0.0.0",()=>console.log("RUNNING",PORT));
