const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 📁 Статичні файли (звуки, фото)
app.use("/sounds", express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public")));

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

/* ---------- ФРОНТЕНД (ОНОВЛЕНИЙ ДИЗАЙН + ФОТО) ---------- */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<title>🔥 PARALLEL SHOW | 31 річчя</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    user-select: none;
  }

  body {
    background: linear-gradient(135deg, #0a1f0a 0%, #061206 100%);
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    padding: 20px;
    color: #eef5e6;
  }

  .container {
    max-width: 850px;
    margin: 0 auto;
  }

  /* ШАПКА З ЛОГО І ФОТО АЗК */
  .hero {
    background: rgba(10, 20, 8, 0.7);
    backdrop-filter: blur(10px);
    border-radius: 48px;
    border: 1px solid #39ff14;
    padding: 20px 25px;
    margin-bottom: 30px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
  }

  .logo-area h1 {
    font-size: 2rem;
    background: linear-gradient(135deg, #b3ff99, #39ff14);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: 3px;
  }
  .logo-area p {
    font-size: 0.8rem;
    color: #bcf0a6;
  }

  .station-photo {
    max-width: 280px;
    border-radius: 32px;
    border: 2px solid #39ff14;
    box-shadow: 0 0 15px #39ff1470;
    object-fit: cover;
  }

  /* ТАЙМЕР І ПРОГРЕС */
  .info-panel {
    background: #071007cc;
    border-radius: 60px;
    padding: 10px 20px;
    margin: 15px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    border: 1px solid #2a6b2a;
  }
  .timer-box {
    font-family: monospace;
    font-size: 2rem;
    font-weight: bold;
    background: #00000066;
    padding: 5px 20px;
    border-radius: 50px;
    color: #fcffb3;
  }
  .danger {
    color: #ff5e5e;
    text-shadow: 0 0 6px red;
    animation: pulse 0.5s infinite;
  }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } }

  /* ПИТАННЯ */
  .question-card {
    background: #0f1a0ecc;
    border-radius: 36px;
    padding: 25px;
    text-align: center;
    border: 1px solid #39ff14;
    margin: 20px 0;
  }
  .question-text {
    font-size: 1.7rem;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 25px;
  }

  /* ПОЛЯ ДЛЯ ВВОДУ ВІДПОВІДІ */
  .answer-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 25px 0;
  }
  .letter-cell {
    width: 60px;
    height: 70px;
    background: #0a130a;
    border: 2px solid #39ff14;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.1s;
  }
  .letter-cell input {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    text-align: center;
    font-size: 28px;
    font-weight: bold;
    color: #ffffff;
    text-transform: uppercase;
    outline: none;
    font-family: monospace;
    border-radius: 14px;
  }
  .cell-correct {
    background: #1f6b1f;
    border-color: #aaffaa;
    box-shadow: 0 0 8px #39ff14;
  }
  .cell-wrong {
    background: #7a2e2e;
    border-color: #ff8888;
  }

  /* КНОПКИ */
  .action-btn {
    background: #39ff14;
    border: none;
    padding: 12px 32px;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 60px;
    cursor: pointer;
    margin: 15px 0;
    transition: 0.2s;
    color: #052005;
  }
  .action-btn:hover {
    background: #7eff5a;
    transform: scale(1.02);
  }

  /* СЕКЦІЯ ТЕЛЕФОНУ */
  .phone-card {
    background: #0d1a0dee;
    border-radius: 32px;
    padding: 20px;
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
  #resultPromo {
    font-size: 1.9rem;
    font-weight: bold;
    color: #ffee88;
    word-break: break-all;
  }
  .hidden { display: none; }
  .flash {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
  }
  .flash-active {
    animation: blinkFlash 0.25s ease-out;
  }
  @keyframes blinkFlash {
    0% { opacity: 0.9; }
    100% { opacity: 0; }
  }
  @media (max-width: 600px) {
    .letter-cell { width: 45px; height: 55px; }
    .letter-cell input { font-size: 22px; }
    .question-text { font-size: 1.2rem; }
    .station-photo { max-width: 200px; }
  }
</style>
</head>
<body>

<div class="container">
  <div class="hero">
    <div class="logo-area">
      <h1>⚡ PARALLEL ⚡</h1>
      <p>НАЦІОНАЛЬНА МЕРЕЖА АЗК</p>
      <p>🔥 31 річчя 🔥</p>
    </div>
    <!-- ФОТО АЗК PARALLEL (замініть URL на реальне фото, якщо треба) -->
    <img class="station-photo" src="https://upload.wikimedia.org/wikipedia/commons/3/34/POL_Orlen_stacja_paliw.jpg" alt="АЗК Parallel" onerror="this.src='https://via.placeholder.com/280x160?text=PARALLEL+AZK'">
  </div>

  <div class="info-panel">
    <span>⏱️ Час на питання</span>
    <span class="timer-box" id="timerDisplay">10</span>
    <button class="action-btn" id="submitBtn">✅ Відповісти</button>
  </div>

  <div class="question-card">
    <div class="question-text" id="questionText"></div>
    <div class="answer-row" id="answerRow"></div>
  </div>

  <div id="phoneSection" class="phone-card hidden">
    <h3>🎉 Вітаємо з перемогою!</h3>
    <p>Введіть номер, щоб отримати промокод</p>
    <input type="tel" id="phoneInput" class="phone-input" placeholder="+380XXXXXXXXX">
    <br>
    <button class="action-btn" onclick="sendSMS()">📲 Надіслати код</button>
    <div id="codeBlock" class="hidden" style="margin-top: 15px;">
      <input type="text" id="codeInput" class="phone-input" placeholder="Код з SMS" style="width:150px">
      <button class="action-btn" onclick="verifyCode()">Перевірити</button>
    </div>
    <div id="finalPromo" style="margin-top: 20px; font-size: 1.3rem;"></div>
  </div>

  <div id="resultMessage" style="text-align:center; margin-top:20px;"></div>
</div>

<div class="flash" id="flashOverlay"></div>

<script>
  // ==================== ПИТАННЯ ====================
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

  let currentIndex = 0;
  let timeLeft = 12;
  let timerInterval = null;
  let answerCells = [];
  let gameActive = true;
  let userAnswers = [];

  // Звуки (опціонально)
  const soundCorrect = new Audio("/sounds/correct.mp3");
  const soundWrong = new Audio("/sounds/wrong.mp3");
  const soundTick = new Audio("/sounds/tick.mp3");

  // DOM елементи
  const questionEl = document.getElementById("questionText");
  const answerRow = document.getElementById("answerRow");
  const timerDisplay = document.getElementById("timerDisplay");
  const submitBtn = document.getElementById("submitBtn");
  const flashOverlay = document.getElementById("flashOverlay");

  function playFlash() {
    flashOverlay.classList.remove("flash-active");
    setTimeout(() => flashOverlay.classList.add("flash-active"), 5);
    setTimeout(() => flashOverlay.classList.remove("flash-active"), 300);
  }

  // Побудова полів для введення (клітинки)
  function buildCurrentQuestion() {
    answerRow.innerHTML = "";
    answerCells = [];
    const correctAnswer = ANSWERS[currentIndex];
    const letters = correctAnswer.split("");

    letters.forEach((letter, idx) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = "letter-cell";
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.dataset.index = idx;
      input.dataset.expected = letter;
      input.value = (userAnswers[currentIndex] && userAnswers[currentIndex][idx]) || "";

      input.addEventListener("input", (e) => {
        let val = e.target.value;
        if (val.length) {
          let upper = val.charAt(val.length - 1).toUpperCase();
          if (/^[A-ZА-ЯЄЇҐІ]$/i.test(upper)) {
            e.target.value = upper;
            // зберігаємо у тимчасову відповідь
            if (!userAnswers[currentIndex]) userAnswers[currentIndex] = [];
            userAnswers[currentIndex][idx] = upper;
            // перехід до наступного поля
            const nextInput = cellDiv.nextElementSibling?.querySelector("input");
            if (nextInput) nextInput.focus();
          } else {
            e.target.value = "";
          }
        } else {
          if (userAnswers[currentIndex]) userAnswers[currentIndex][idx] = "";
        }
      });

      cellDiv.appendChild(input);
      answerRow.appendChild(cellDiv);
      answerCells.push(cellDiv);
    });
  }

  // Таймер
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerDisplay.innerText = timeLeft;
    timerDisplay.classList.remove("danger");

    timerInterval = setInterval(() => {
      if (!gameActive) return;
      timeLeft--;
      timerDisplay.innerText = timeLeft;
      if (timeLeft <= 3) {
        timerDisplay.classList.add("danger");
        if (soundTick) soundTick.play().catch(e=>{});
      }
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
  }

  // Перевірка відповіді
  function checkAnswer() {
    stopTimer();
    const userAnswer = (userAnswers[currentIndex] || []).join("");
    const correctAnswer = ANSWERS[currentIndex];

    // Показати правильні/неправильні літери
    for (let i = 0; i < correctAnswer.length; i++) {
      const cell = answerCells[i];
      const input = cell.querySelector("input");
      const userChar = input.value.toUpperCase() || "";
      if (userChar === correctAnswer[i]) {
        cell.classList.add("cell-correct");
      } else {
        cell.classList.add("cell-wrong");
      }
    }

    if (userAnswer === correctAnswer) {
      // Правильно
      if (soundCorrect) soundCorrect.play().catch(e=>{});
      playFlash();
      setTimeout(() => {
        currentIndex++;
        if (currentIndex < QUESTIONS.length) {
          // Наступне питання
          timeLeft = 12;
          questionEl.innerText = QUESTIONS[currentIndex];
          buildCurrentQuestion();
          startTimer();
        } else {
          // Вікторина завершена
          gameActive = false;
          document.getElementById("phoneSection").classList.remove("hidden");
          document.getElementById("resultMessage").innerHTML = "🏆 Вітаємо! Ви пройшли всі питання! 🏆";
          if(soundCorrect) soundCorrect.play();
          playFlash();
        }
      }, 600);
    } else {
      // Неправильно — кінець гри
      if (soundWrong) soundWrong.play().catch(e=>{});
      playFlash();
      setTimeout(() => {
        alert("❌ Неправильна відповідь. Спробуйте ще раз з початку!");
        location.reload();
      }, 500);
    }
  }

  function handleTimeout() {
    if (!gameActive) return;
    gameActive = false;
    alert("⏰ Час вичерпано! Почніть заново.");
    location.reload();
  }

  // Кнопка відповіді
  submitBtn.onclick = () => {
    if (!gameActive) return;
    checkAnswer();
  };

  // SMS API
  window.sendSMS = async () => {
    const phone = document.getElementById("phoneInput").value.trim();
    if (!phone.match(/^\+380\d{9}$/)) {
      alert("Невірний формат. Використовуйте +380XXXXXXXXX");
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
      document.getElementById("codeBlock").classList.remove("hidden");
    } else {
      alert("Помилка: " + data.error);
    }
  };

  window.verifyCode = async () => {
    const phone = document.getElementById("phoneInput").value.trim();
    const code = document.getElementById("codeInput").value.trim();
    const resp = await fetch("/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code })
    });
    const data = await resp.json();
    if (data.success) {
      document.getElementById("finalPromo").innerHTML = "🎁 Ваш промокод: <strong>" + data.promo + "</strong><br>Збережіть його для участі в розіграші!";
      document.getElementById("resultMessage").innerHTML = "✅ Ви зареєстровані! Дякуємо за участь.";
    } else {
      alert("Невірний код або помилка");
    }
  };

  // Ініціалізація гри
  questionEl.innerText = QUESTIONS[0];
  buildCurrentQuestion();
  startTimer();
  gameActive = true;
</script>
</body>
</html>
  `);
});

/* ========== API РОУТИ ========== */
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

/* ========== СТАРТ СЕРВЕРА ========== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 PARALLEL SHOW запущено на порту ${PORT}`);
});
