const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ----------- STORAGE ----------- */
const smsStore = {};
const users = {};

/* ----------- HELPERS ----------- */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ----------- HEALTH ----------- */
app.get("/health", (req, res) => res.send("OK"));

/* ----------- MAIN PAGE ----------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<title>Parallel WOW Crossword</title>

<style>
body{
  margin:0;
  font-family: Arial;
  background: radial-gradient(circle,#061006,#000);
  color:#39FF14;
  text-align:center;
}

h1{
  margin-top:20px;
  font-size:28px;
  letter-spacing:2px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(7,50px);
  gap:8px;
  justify-content:center;
  margin-top:30px;
}

.cell{
  width:50px;
  height:50px;
  border:2px solid #39FF14;
  border-radius:8px;
  background:#0a0f0a;
}

.cell input{
  width:100%;
  height:100%;
  background:transparent;
  border:none;
  color:#39FF14;
  font-size:24px;
  text-align:center;
  outline:none;
}

.correct{ background:#123d12 !important; }
.wrong{ background:#3d1212 !important; border-color:red !important; }

button{
  margin-top:20px;
  padding:12px 30px;
  border:none;
  background:#39FF14;
  font-weight:bold;
  border-radius:20px;
  cursor:pointer;
  transition:0.2s;
}

button:hover{ transform:scale(1.05); }

#phoneBlock{ display:none; margin-top:20px; }

input.phone{
  padding:10px;
  border-radius:10px;
  border:1px solid #39FF14;
  background:#000;
  color:#39FF14;
}

#promo{
  font-size:28px;
  margin-top:20px;
  font-weight:bold;
}
</style>
</head>

<body>

<h1>PARALLEL WOW CROSSWORD</h1>
<p>Збери фінальне слово</p>

<div class="grid" id="grid"></div>

<button onclick="check()">Перевірити</button>

<div id="phoneBlock">
  <h3>Введи номер</h3>
  <input id="phone" class="phone" placeholder="+380XXXXXXXXX"><br><br>
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
    if(val === answer[i]){
      c.classList.add("correct");
    } else {
      c.classList.add("wrong");
      ok = false;
    }
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
    body:JSON.stringify({phone, consent:true, ageConfirmed:true})
  });

  const d = await r.json();

  if(d.success){
    alert("Код відправлено (дивись сервер лог)");
    document.getElementById("codeBlock").style.display="block";
  } else {
    alert(d.error);
  }
}

async function verify(){
  const phone = document.getElementById("phone").value;
  const code = document.getElementById("code").value;

  const r = await fetch("/verify-code",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({phone, code})
  });

  const d = await r.json();

  if(d.success){
    document.getElementById("promo").innerText = d.promo;
  } else {
    alert(d.error);
  }
}
</script>

</body>
</html>
  `);
});

/* ----------- API ----------- */
app.post("/send-code",(req,res)=>{
  const { phone } = req.body;

  const code = generateCode();
  smsStore[phone] = code;

  console.log("SMS:", phone, code);

  res.json({success:true});
});

app.post("/verify-code",(req,res)=>{
  const { phone, code } = req.body;

  if(smsStore[phone] !== code)
    return res.json({success:false,error:"wrong code"});

  const promo = generatePromo();
  users[phone] = true;

  res.json({success:true,promo});
});

/* ----------- START ----------- */
app.listen(PORT,"0.0.0.0",()=>{
  console.log("WOW SERVER:",PORT);
});
