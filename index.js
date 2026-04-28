const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Статичні файли для звуків та фото
app.use("/sounds", express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ========== БАЗА ДАНИХ ========== */
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

/* ========== ДОПОМІЖНІ ФУНКЦІЇ ========== */
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genPromo() {
  return "PWR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ========== ГОЛОВНА СТОРІНКА ========== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<title>🔥 Запальний конкурс від Parallel | 31 річчя</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: linear-gradient(135deg, #0a1a0a 0%, #030803 100%);
    font-family: 'Segoe UI', system-ui, 'Roboto', sans-serif;
    min-height: 100vh;
    padding: 16px;
    color: #eef5e6;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* Шапка */
  .hero-header {
    background: rgba(8, 20, 5, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 48px;
    border: 1px solid #39ff14;
    padding: 20px 25px;
    margin-bottom: 25px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
  }
  .brand h1 {
    font-size: 1.8rem;
    background: linear-gradient(135deg, #ccff99, #39ff14);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: 2px;
  }
  .brand p {
    font-size: 0.8rem;
    color: #b8f2a0;
  }
  .gas-station-img {
    max-width: 260px;
    border-radius: 28px;
    border: 2px solid #39ff14;
    box-shadow: 0 0 12px #39ff1470;
    object-fit: cover;
  }

  /* Інформаційна панель */
  .info-bar {
    background: #0a130ae0;
    border-radius: 60px;
    padding: 10px 20px;
    margin: 15px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    border: 1px solid #2e6b2e;
  }
  .timer {
    font-family: monospace;
    font-size: 2rem;
    font-weight: bold;
    background: #00000066;
    padding: 5px 20px;
    border-radius: 50px;
    color: #ffffb0;
  }
  .timer-danger {
    color: #ff6666;
    text-shadow: 0 0 6px red;
    animation: pulse 0.6s infinite;
  }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } }

  /* Картка питання */
  .quiz-card {
    background: #0f1a0fcc;
    backdrop-filter: blur(4px);
    border-radius: 40px;
    padding: 20px;
    border: 1px solid #39ff14;
    margin: 20px 0;
  }
  .question-header {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .question-icon {
    font-size: 2rem;
  }
  .question-text {
    font-size: 1.5rem;
    font-weight: bold;
    flex: 1;
  }
  .station-mini {
    max-width: 100px;
    border-radius: 20px;
    border: 1px solid #39ff14;
  }

  /* Рядок відповіді (клітинки з інпутами) */
  .answer-grid {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 25px 0;
  }
  .letter-box {
    width: 65px;
    height: 75px;
    background: #0a130a;
    border: 2px solid #39ff14;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .letter-box input {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    text-align: center;
    font-size: 30px;
    font-weight: bold;
    color: #fff;
    text-transform: uppercase;
    outline: none;
    font-family: monospace;
    border-radius: 14px;
    caret-color: #39ff14;
  }
  .correct-cell {
    background: #1f6b1f;
    border-color: #aaffaa;
    box-shadow: 0 0 10px #39ff14;
  }
  .wrong-cell {
    background: #7a2e2e;
    border-color: #ff8888;
  }

  /* Кнопки */
  .btn {
    background: #39ff14;
    border: none;
    padding: 12px 32px;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 60px;
    cursor: pointer;
    margin: 10px 5px;
    transition: 0.2s;
    color: #052005;
  }
  .btn:hover {
    background: #6eff4a;
    transform: scale(1.02);
  }

  /* Секція телефону */
  .phone-section {
    background: #0d1a0dee;
    border-radius: 32px;
    padding: 24px;
    text-align: center;
    margin-top: 25px;
    border: 1px solid #39ff14;
  }
  .phone-input {
    background: #111e11;
    border: 2px solid #39ff14;
    border-radius: 60px;
    padding: 12px 20px;
    font-size: 1rem;
    color: white;
    text-align: center;
    width: 260px;
  }
  .final-promo {
    font-size: 1.6rem;
    font-weight: bold;
    color: #ffee88;
    margin-top: 15px;
    word-break: break-word;
  }
  .hidden { display: none; }
  .flash-effect {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
  }
  .flash-active {
    animation: flashAnim 0.25s ease-out;
  }
  @keyframes flashAnim {
    0% { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @media (max-width: 600px) {
    .letter-box { width: 48px; height: 58px; }
    .letter-box input { font-size: 24px; }
    .question-text { font-size: 1.1rem; }
    .gas-station-img { max-width: 180px; }
    .station-mini { max-width: 70px; }
  }
</style>
</head>
<body>

<div class="container">
  <!-- Верхня частина з фото АЗК -->
  <div class="hero-header">
    <div class="brand">
      <h1>⚡ Запальний конкурс від PARALLEL ⚡</h1>
      <p>31 річчя національної мережі АЗК</p>
    </div>
    <img class="gas-station-img" src="https://upload.wikimedia.org/wikipedia/commons/3/34/POL_Orlen_stacja_paliw.jpg" 
         alt="АЗК Parallel" onerror="this.src='https://via.placeholder.com/260x140?text=PARALLEL+STATION'">
  </div>

  <div class="info-bar">
    <span>⏱️ Час на питання</span>
    <span class="timer" id="timerValue">12</span>
    <button class="btn" id="submitAnswerBtn">✅ Відповісти</button>
  </div>

  <div class="quiz-card" id="quizCard">
    <div class="question-header">
      <span class="question-icon">⛽</span>
      <span class="question-text" id="questionText"></span>
      <!-- маленьке фото поруч з питанням -->
      <img class="station-mini" id="miniStationImg" src="https://upload.wikimedia.org/wikipedia/commons/3/34/POL_Orlen_stacja_paliw.jpg" alt="AZK">
    </div>
    <div class="answer-grid" id="answerGrid"></div>
  </div>

  <!-- Секція після перемоги -->
  <div id="phoneBlock" class="phone-section hidden">
    <h3>🏆 Вітаємо! Ви виграли промокод 🏆</h3>
    <p>Введіть номер телефону для участі в розіграші</p>
    <input type="tel" id="phoneNumber" class="phone-input" placeholder="+380XXXXXXXXX">
    <br>
    <button class="btn" id="sendSmsBtn">📲 Надіслати SMS-код</button>
    <div id="codeArea" class="hidden" style="margin-top: 15px;">
      <input type="text" id="smsCode" class="phone-input" placeholder="Код з SMS" style="width:150px">
      <button class="btn" id="verifyCodeBtn">Перевірити</button>
    </div>
    <div id="promoResult" class="final-promo"></div>
  </div>
  
  <div id="endMessage" style="text-align:center; margin:20px 0;"></div>
</div>

<div class="flash-effect" id="flashOverlay"></div>

<script>
  // ==================== ПИТАННЯ ТА ВІДПОВІДІ ====================
  const QUESTIONS = [
    "Фірмовий колір",
    "Засновник",
    "Місто №1 за кількістю АЗК Parallel",
    "Власник",
    "Фігура в лого Parallel",
    "Найзапашніше на АЗК Parallel",
    "Натуральний переможець голоду на АЗК Parallel"
  ];
  const ANSWERS = [
    "ЗЕЛЕНИЙ",
    "СКМ",
    "КИЇВ",
    "ДУБІНІН",
    "КВАДРАТ",
    "КАВА",
    "ХОТДОГ"
  ];

  let currentIdx = 0;
  let timeRemaining = 12;
  let timerInterval = null;
  let active = true;
  let userInputs = [];      // зберігає введені літери для поточного питання

  // DOM елементи
  const questionEl = document.getElementById("questionText");
  const answerGrid = document.getElementById("answerGrid");
  const timerSpan = document.getElementById("timerValue");
  const submitBtn = document.getElementById("submitAnswerBtn");
  const flashDiv = document.getElementById("flashOverlay");

  // Допоміжні функції
  function playFlash() {
    flashDiv.classList.remove("flash-active");
    setTimeout(() => flashDiv.classList.add("flash-active"), 5);
    setTimeout(() => flashDiv.classList.remove("flash-active"), 300);
  }

  // Побудова полів введення для поточного питання
  function buildInputsForCurrent() {
    answerGrid.innerHTML = "";
    userInputs = [];
    const correctAnswer = ANSWERS[currentIdx];
    const letters = correctAnswer.split("");

    letters.forEach((expectedLetter, pos) => {
      const box = document.createElement("div");
      box.className = "letter-box";
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.dataset.pos = pos;
      input.dataset.expected = expectedLetter;
      
      input.addEventListener("input", (e) => {
        let val = e.target.value;
        if (val.length) {
          let upperVal = val.charAt(val.length - 1).toUpperCase();
          if (/^[A-ZА-ЯЄЇҐІ]$/i.test(upperVal)) {
            e.target.value = upperVal;
            userInputs[pos] = upperVal;
            // автоматичний перехід до наступного поля
            const nextBox = box.nextElementSibling;
            if (nextBox) {
              const nextInput = nextBox.querySelector("input");
              if (nextInput) nextInput.focus();
            }
          } else {
            e.target.value = "";
          }
        } else {
          userInputs[pos] = "";
        }
      });
      
      box.appendChild(input);
      answerGrid.appendChild(box);
    });
  }

  // Перевірка та підсвічування
  function evaluateAndShowResult() {
    if (!active) return;
    stopTimer();
    const correctAnswer = ANSWERS[currentIdx];
    const userAnswer = userInputs.join("");
    const boxes = document.querySelectorAll(".letter-box");
    
    // Підсвітка правильно/неправильно
    for (let i = 0; i < correctAnswer.length; i++) {
      const box = boxes[i];
      const inp = box.querySelector("input");
      const userChar = (inp.value || "").toUpperCase();
      if (userChar === correctAnswer[i]) {
        box.classList.add("correct-cell");
        box.classList.remove("wrong-cell");
      } else {
        box.classList.add("wrong-cell");
        box.classList.remove("correct-cell");
      }
    }
    
    if (userAnswer === correctAnswer) {
      // Правильна відповідь
      playFlash();
      setTimeout(() => {
        currentIdx++;
        if (currentIdx < QUESTIONS.length) {
          // Наступне питання
          timeRemaining = 12;
          timerSpan.innerText = timeRemaining;
          questionEl.innerText = QUESTIONS[currentIdx];
          buildInputsForCurrent();
          startTimer();
        } else {
          // Гра завершена перемогою
          active = false;
          document.getElementById("phoneBlock").classList.remove("hidden");
          document.getElementById("endMessage").innerHTML = "🎉 Ви пройшли всі випробування! Отримайте промокод 🎉";
          playFlash();
        }
      }, 500);
    } else {
      // Неправильна відповідь — програш
      playFlash();
      setTimeout(() => {
        alert("❌ Неправильна відповідь. Конкурс завершено. Спробуйте ще раз!");
        location.reload();
      }, 400);
    }
  }

  // Таймер
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerSpan.innerText = timeRemaining;
    timerSpan.classList.remove("timer-danger");
    timerInterval = setInterval(() => {
      if (!active) return;
      timeRemaining--;
      timerSpan.innerText = timeRemaining;
      if (timeRemaining <= 3) {
        timerSpan.classList.add("timer-danger");
      }
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        handleTimeout();
      }
    }, 1000);
  }
  
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
  }
  
  function handleTimeout() {
    if (!active) return;
    active = false;
    alert("⏰ Час вийшов! Ви не встигли. Спробуйте знову.");
    location.reload();
  }
  
  // SMS та верифікація
  document.getElementById("sendSmsBtn").onclick = async () => {
    const phone = document.getElementById("phoneNumber").value.trim();
    if (!phone.match(/^\+380\d{9}$/)) {
      alert("Формат: +380XXXXXXXXX");
      return;
    }
    const resp = await fetch("/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await resp.json();
    if (data.success) {
      alert("Код надіслано!");
      document.getElementById("codeArea").classList.remove("hidden");
    } else {
      alert("Помилка: " + (data.error || ""));
    }
  };
  
  document.getElementById("verifyCodeBtn").onclick = async () => {
    const phone = document.getElementById("phoneNumber").value.trim();
    const code = document.getElementById("smsCode").value.trim();
    const resp = await fetch("/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code })
    });
    const data = await resp.json();
    if (data.success) {
      document.getElementById("promoResult").innerHTML = "🎁 Ваш промокод: <strong>" + data.promo + "</strong><br>Збережіть його для участі в розіграші!";
      document.getElementById("endMessage").innerHTML = "✅ Дякуємо! Ви в списку учасників.";
    } else {
      alert("Код недійсний або застарів");
    }
  };

  // Обробник кнопки "Відповісти"
  submitBtn.onclick = () => {
    if (active) evaluateAndShowResult();
  };
  
  // Ініціалізація гри
  function initGame() {
    currentIdx = 0;
    timeRemaining = 12;
    active = true;
    questionEl.innerText = QUESTIONS[0];
    buildInputsForCurrent();
    startTimer();
  }
  
  initGame();
</script>
</body>
</html>
  `);
});

/* ========== API ДЛЯ SMS ========== */
app.post("/send-code", (req, res) => {
  const { phone } = req.body;
  const code = genCode();
  db.prepare("DELETE FROM codes WHERE phone=?").run(phone);
  db.prepare("INSERT INTO codes VALUES (?,?,?)").run(phone, code, Date.now() + 300000);
  console.log(`📱 SMS код для ${phone}: ${code}`);
  res.json({ success: true });
});

app.post("/verify-code", (req, res) => {
  const { phone, code } = req.body;
  const row = db.prepare("SELECT * FROM codes WHERE phone=?").get(phone);
  if (!row || row.code !== code) return res.json({ success: false, error: "Невірний код" });
  const promo = genPromo();
  db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)").run(phone, promo);
  res.json({ success: true, promo });
});

/* ========== ЗАПУСК ========== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 Запальний конкурс Parallel запущено на порту ${PORT}`);
});
