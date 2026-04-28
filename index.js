const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Anti-SEO
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Сховища
const smsStore = {};
const users = {};
const ipStore = {};

function generateCode() {
  return Math.floor(100000 + Math.random() 900000).toString();
}

function generatePromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function isRateLimited(ip) {
  const now = Date.now();
  if (!ipStore[ip]) ipStore[ip] = [];
  ipStore[ip] = ipStore[ip].filter(t => now - t < 10  60  1000);
  if (ipStore[ip].length > 5) return true;
  ipStore[ip].push(now);
  return false;
}

// Відправка коду
app.post("/send-code", async (req, res) => {
  const { phone, consent, ageConfirmed } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!consent) return res.json({ success: false, error: "Потрібна згода на обробку даних" });
  if (!ageConfirmed) return res.json({ success: false, error: "Тільки для 18+" });
  if (isRateLimited(ip)) return res.json({ success: false, error: "Забагато спроб" });
  if (!phone || !phone.match(/^\+380\d{9}$/)) return res.json({ success: false, error: "Невірний номер" });
  if (users[phone]) return res.json({ success: false, error: "Ви вже брали участь" });

  const code = generateCode();
  smsStore[phone] = code;
  console.log("SMS код для", phone, ":", code);

  setTimeout(() => { if (smsStore[phone] === code) delete smsStore[phone]; }, 5  60  1000);
  res.json({ success: true });
});

// Перевірка коду
app.post("/verify-code", async (req, res) => {
  const { phone, code } = req.body;
  if (!smsStore[phone]) return res.json({ success: false, error: "Код прострочений" });
  if (smsStore[phone] !== code) return res.json({ success: false, error: "Невірний код" });

  const promo = generatePromo();
  users[phone] = true;
  delete smsStore[phone];
  console.log("Новий учасник:", { phone, promo });
  res.json({ success: true, promo });
});

// Інформація про акцію
app.get("/campaign-info", (req, res) => {
  res.json({
    title: "АКЦІЯ PARALLEL до 31-річчя!",
    prizes: ["1000$ на паливо", "20л пального (10 призів)", "10л (20 призів)", "50 кав", "100 хот-догів"],
    rules: "Повністю правильний тест → SMS → промокод"
  });
});

// ГОЛОВНА СТОРІНКА (тест + перевірка віку)
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Тест Parallel</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #050805 0%, #0b1a0b 100%);
            color: #e0f2e0;
            padding: 20px;
        }
        .container { max-width: 950px; margin: 0 auto; }
        .logo {
            background: #0c130c;
            border-radius: 20px;
            padding: 12px 24px;
            display: inline-block;
            color: #39FF14;
            font-weight: bold;
            font-size: 24px;
            border: 1px solid #39FF14;
        }
        .title {
            font-size: clamp(16px, 5vw, 24px);
            font-weight: 800;
            color: #39FF14;
            background: rgba(0,0,0,0.55);
            padding: 12px 20px;
            border-radius: 50px;
            margin: 15px auto;
            display: inline-block;
        }
        .test-card, .phone-card {
            background: #0f140fe8;
            border: 1px solid #39FF14;
            border-radius: 24px;
            padding: 20px;
            margin: 20px 0;
        }
        .q-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px;
            border-bottom: 1px solid #2b4a1f;
        }
        .question-text { font-weight: 600; font-size: 0.9rem; }
        .inputs { display: flex; gap: 5px; flex-wrap: wrap; }
        .cell {
            width: 42px;
            height: 42px;
            background: #0a0f0a;
            border: 2px solid #39FF14;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cell input {
            width: 100%;
            height: 100%;
            background: transparent;
            border: none;
            color: white;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            outline: none;
        }
        .cell.correct { background: #1f3d1f; }
        .cell.wrong { background: #3d1f1f; border-color: #ff4d4d; }
        button {
            background: #39FF14;
            border: none;
            padding: 10px 24px;
            font-weight: bold;
            border-radius: 60px;
            cursor: pointer;
            font-size: 1rem;
            margin: 5px;
        }
        .phone-input {
            background: #0a0f0a;
            border: 2px solid #39FF14;
            border-radius: 50px;
            padding: 14px 20px;
            font-size: 1.1rem;
            color: white;
            width: 100%;
            max-width: 300px;
            text-align: center;
        }
        .promo-code {
            font-size: 32px;
            font-weight: bold;
            color: #39FF14;
            font-family: monospace;
            background: #0a130a;
            display: inline-block;
            padding: 12px 24px;
            border-radius: 16px;
        }
        .hidden { display: none; }
        .error { color: #ff8888; background: #5a1a1a; padding: 10px; border-radius: 12px; margin: 10px 0; }
        .success { color: #88ff88; background: #1a5a1a; padding: 10px; border-radius: 12px; }
        .modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.98); z-index: 10001; display: flex;
            align-items: center; justify-content: center;
        }
        .modal-content {
            background: #1a2a1a; border: 2px solid #39FF14; border-radius: 32px;
            padding: 30px; max-width: 400px; text-align: center;
        }
        .modal-content label { display: flex; align-items: center; gap: 10px; margin: 15px 0; }
        @media (max-width: 600px) { .cell { width: 36px; height: 36px; } }
    </style>
</head>
<body>

<div id="modal" class="modal">
    <div class="modal-content">
        <h2>Підтвердження</h2>
        <label><input type="checkbox" id="ageCheck"> Менi є 18+</label>
        <label><input type="checkbox" id="consentCheck"> Згода на обробку даних</label>
        <button id="confirmBtn">Пiдтвердити</button>
        <button id="denyBtn">Вiдмовитись</button>
    </div>
</div>

<div id="main" style="display:none;">
    <div class="container">
        <div class="logo">PARALLEL</div>
        <div class="title">ЗАПАЛЬНИЙ ТЕСТ ДО 31-РIЧЧЯ</div>

        <div class="test-card" id="testSection">
            <div id="game"></div>
            <button onclick="checkTest()">Завершити тест</button>
        </div>

        <div class="phone-card hidden" id="phoneSection">
            <h3>Пiдтвердiть участь</h3>
            <input type="tel" id="phone" class="phone-input" placeholder="+380XXXXXXXXX">
            <div id="codeGroup" style="display:none;">
                <input type="text" id="smsCode" class="phone-input" placeholder="Код" style="max-width:150px;">
                <button onclick="verifyCode()">Пiдтвердити</button>
            </div>
            <button id="sendBtn" onclick="requestCode()">Надiслати код</button>
            <div id="phoneMessage"></div>
        </div>

        <div class="test-card hidden" id="resultSection">
            <h2>Вiтаємо!</h2>
            <div class="promo-code" id="promoCode"></div>
            <button onclick="location.reload()">Спробувати знову</button>
        </div>

        <div class="test-card" id="prizesInfo"></div>
    </div>
</div>

<script>
    const questions = [
        { text: "Фiрмовий колiр", answer: "ЗЕЛЕНИЙ" },
        { text: "Засновник", answer: "СКМ" },
        { text: "Мiсто №1 за кiлькiстю АЗК Parallel", answer: "КИЇВ" },
        { text: "Власник", answer: "ДУБІНІН" },
        { text: "Фiгура в лого Parallel", answer: "КВАДРАТ" },
        { text: "Найзапашнiше на АЗК Parallel", answer: "КАВА" },
        { text: "Натуральний переможець голоду", answer: "ХОТДОГ" }
    ];

    let allInputs = [], testCompleted = false, currentPhone = null, ageConfirmed = false, consentGiven = false;

    document.getElementById('confirmBtn').onclick = () => {
        if (!document.getElementById('ageCheck').checked) return alert('Пiдтвердiть 18+');
        if (!document.getElementById('consentCheck').checked) return alert('Дайте згоду');
        ageConfirmed = true;
        consentGiven = true;
        document.getElementById('modal').style.display = 'none';
        document.getElementById('main').style.display = 'block';
        buildTest();
        fetch('/campaign-info').then(r=>r.json()).then(data => {
            document.getElementById('prizesInfo').innerHTML = '<h3>' + data.title + '</h3><ul>' + data.prizes.map(p=>'<li>'+p+'</li>').join('') + '</ul>';
        });
    };
    document.getElementById('denyBtn').onclick = () => { document.body.innerHTML = '<h2>Доступ заборонено</h2>'; };

    function buildTest() {
        const container = document.getElementById('game');
        container.innerHTML = '';
        allInputs = [];
        questions.forEach((q, idx) => {
            const div = document.createElement('div');
            div.className = 'q-item';
            div.innerHTML = '<div class="question-text">' + (idx+1) + '. ' + q.text + '</div><div class="inputs" id="inp-' + idx + '"></div>';
            const wrap = div.querySelector('.inputs');
            q.answer.split('').forEach((letter, i) => {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const inp = document.createElement('input');
                inp.maxLength = 1;
                inp.dataset.q = idx;
                inp.oninput = (e) => {
                    let v = e.target.value;
                    if(v) {
                        let up = v.toUpperCase();
                        if(/^[A-ZА-ЯЄЇҐІ]$/.test(up)) {
                            e.target.value = up;
                            let sibs = [...e.target.closest('.inputs').querySelectorAll('input')];
                            let ci = sibs.indexOf(e.target);
                            if(ci+1 < sibs.length) sibs[ci+1].focus();
                        } else e.target.value = '';
                    }
                };
                cell.appendChild(inp);
                wrap.appendChild(cell);
                allInputs.push(inp);
            });
            container.appendChild(div);
        });
    }

    function calculateCorrect() {
        let correct = 0;
        for(let qi=0; qi<questions.length; qi++) {
            let inputs = allInputs.filter(i => i.dataset.q == qi);
            let expected = questions[qi].answer.split('');
            let ok = true;
            for(let i=0; i<expected.length; i++) if((inputs[i]?.value||'').toUpperCase() !== expected[i]) ok=false;
            if(ok) correct++;
        }
        return correct;
    }

    window.checkTest = function() {
        if(testCompleted) return;
        let correct = calculateCorrect();
        if(correct === questions.length) {
            testCompleted = true;
            document.getElementById('testSection').style.display = 'none';
            document.getElementById('phoneSection').classList.remove('hidden');
        } else alert('Правильних: ' + correct + '/' + questions.length);
    };

    window.requestCode = async function() {
        let phone = document.getElementById('phone').value.trim();
        if(!phone.match(/^\+380\d{9}$/)) return showMessage('Невiрний формат', 'error');
        currentPhone = phone;
        showMessage('Надсилання...', 'info');
        try {
            let r = await fetch('/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone, ageConfirmed, consent:consentGiven}) });
            let d = await r.json();
            if(d.success) {
                showMessage('Код надiслано! Дивiться консоль сервера', 'success');
                document.getElementById('codeGroup').style.display = 'flex';
                document.getElementById('sendBtn').style.display = 'none';
            } else showMessage(d.error, 'error');
        } catch(e) { showMessage('Помилка сервера', 'error'); }
    };

    window.verifyCode = async function() {
        let code = document.getElementById('smsCode').value.trim();
        if(!code) return showMessage('Введiть код', 'error');
        try {
            let r = await fetch('/verify-code', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone:currentPhone, code}) });
            let d = await r.json();
            if(d.success) {
                document.getElementById('phoneSection').classList.add('hidden');
                document.getElementById('resultSection').classList.remove('hidden');
                document.getElementById('promoCode').innerText = d.promo;
            } else showMessage(d.error, 'error');
        } catch(e) { showMessage('Помилка', 'error'); }
    };

    function showMessage(msg, type) {
        let div = document.getElementById('phoneMessage');
        div.innerHTML = '<div class="' + type + '">' + msg + '</div>';
        setTimeout(() => div.innerHTML = '', 4000);
    }
</script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});