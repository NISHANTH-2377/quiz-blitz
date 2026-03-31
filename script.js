import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove, onDisconnect, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const STORAGE_KEY = 'quizBlitzSession';
const screens = document.querySelectorAll('.screen');
const hostGameBtn = document.getElementById('hostGameBtn');
const playGameBtn = document.getElementById('playGameBtn');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const startHostBtn = document.getElementById('startHostBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const beginGameBtn = document.getElementById('beginGameBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const quizTitleInput = document.getElementById('quizTitle');
const questionList = document.getElementById('questionList');
const previewCard = document.getElementById('previewCard');
const playerNameInput = document.getElementById('playerNameInput');
const gamePinInput = document.getElementById('gamePinInput');
const gamePinDisplay = document.getElementById('gamePinDisplay');
const playerList = document.getElementById('playerList');
const gameTitle = document.getElementById('gameTitle');
const progressText = document.getElementById('progressText');
const nextQuestionText = document.getElementById('nextQuestionText');
const questionText = document.getElementById('questionText');
const answersGrid = document.getElementById('answersGrid');
const timerFill = document.getElementById('timerFill');
const scoreRows = document.getElementById('scoreRows');

let state = {
  role: null,
  name: null,
  pin: null,
  playerId: null,
  quiz: null,
  currentQuestion: 0,
  gameStarted: false,
  ended: false,
  players: [],
  answered: false,
};

let gameListener = null;
let playersListener = null;

function showScreen(id) {
  screens.forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function saveSession() {
  const session = {
    role: state.role,
    name: state.name,
    pin: state.pin,
    playerId: state.playerId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const session = JSON.parse(saved);
    state.role = session.role;
    state.name = session.name;
    state.pin = session.pin;
    state.playerId = session.playerId;
  } catch (error) {
    console.warn('Unable to load saved session', error);
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  state = {
    role: null,
    name: null,
    pin: null,
    playerId: null,
    quiz: null,
    currentQuestion: 0,
    gameStarted: false,
    ended: false,
    players: [],
    answered: false,
  };
}

function createPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function validatePin(pin) {
  return /^\d{4}$/.test(pin);
}

function renderQuestionCards() {
  questionList.innerHTML = '';
  if (!state.quiz || state.quiz.questions.length === 0) {
    questionList.innerHTML = '<p class="label-text">No questions yet. Add one to start the game.</p>';
    return;
  }

  state.quiz.questions.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <strong>Question ${idx + 1}</strong>
        <button class="btn btn-secondary" data-action="remove" data-index="${idx}">Remove</button>
      </div>
      <label>Question text</label>
      <textarea data-role="question" data-index="${idx}">${item.question}</textarea>
      <label>Correct answer</label>
      <select data-role="answer" data-index="${idx}">
        ${item.choices
          .map(
            (choice, choiceIndex) => `
          <option value="${choiceIndex}" ${choiceIndex === item.answer ? 'selected' : ''}>${choice}</option>
        `
          )
          .join('')}
      </select>
      <div style="display:grid;gap:10px;margin-top:14px;">
        ${item.choices
          .map(
            (choice, choiceIndex) => `
          <div>
            <label>Choice ${choiceIndex + 1}</label>
            <input data-role="choice" data-index="${idx}" data-choice="${choiceIndex}" value="${choice}" />
          </div>
        `
          )
          .join('')}
      </div>
    `;
    questionList.appendChild(card);
  });
}

function renderPreview() {
  const current = state.quiz && state.quiz.questions.length ? state.quiz.questions[0] : { question: 'Preview question will show here', choices: ['Option A', 'Option B', 'Option C', 'Option D'] };
  previewCard.innerHTML = `
    <div style="font-size:1.1rem;font-weight:700;">${current.question}</div>
    <div class="answers-grid">
      ${current.choices.map((choice) => `<div class="answer-button" style="cursor:default;">${choice}</div>`).join('')}
    </div>
  `;
}

function updateQuizFromEditor() {
  const title = quizTitleInput.value.trim();
  if (!state.quiz) state.quiz = { title: title || 'Untitled Quiz', questions: [] };
  state.quiz.title = title || 'Untitled Quiz';

  questionList.querySelectorAll('[data-role="question"]').forEach((textarea) => {
    const index = Number(textarea.dataset.index);
    state.quiz.questions[index].question = textarea.value;
  });

  questionList.querySelectorAll('[data-role="choice"]').forEach((input) => {
    const index = Number(input.dataset.index);
    const choiceIndex = Number(input.dataset.choice);
    state.quiz.questions[index].choices[choiceIndex] = input.value;
  });

  questionList.querySelectorAll('[data-role="answer"]').forEach((select) => {
    const index = Number(select.dataset.index);
    state.quiz.questions[index].answer = Number(select.value);
  });
}

function renderPlayers(players) {
  playerList.innerHTML = '';
  if (!players || players.length === 0) {
    playerList.innerHTML = '<li class="label-text">No players joined yet. Use the PIN to invite them.</li>';
    return;
  }
  players.forEach((player) => {
    const li = document.createElement('li');
    li.textContent = `${player.name} — ${player.score} pts${player.answered ? ' (answered)' : ''}`;
    playerList.appendChild(li);
  });
}

function renderQuestion() {
  const question = state.quiz.questions[state.currentQuestion];
  const total = state.quiz.questions.length;
  gameTitle.textContent = state.quiz.title;
  progressText.textContent = `Question ${state.currentQuestion + 1} of ${total}`;
  nextQuestionText.textContent = state.currentQuestion + 1;
  questionText.textContent = question.question;
  answersGrid.innerHTML = '';

  question.choices.forEach((choice, answerIndex) => {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = choice;
    button.dataset.index = answerIndex;
    if (state.role === 'host') {
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
    } else {
      button.addEventListener('click', () => {
        if (state.answered) return;
        state.answered = true;
        submitAnswer(answerIndex);
      });
    }
    answersGrid.appendChild(button);
  });

  if (state.role === 'host') {
    const note = document.createElement('div');
    note.style.marginTop = '18px';
    note.style.color = '#cbd5e1';
    note.style.fontSize = '0.95rem';
    note.textContent = 'Host monitor mode — answer selection is disabled.';
    answersGrid.appendChild(note);
  }
}

function submitAnswer(answerIndex) {
  if (!state.pin || !state.playerId) return;
  const gameRef = ref(db, `games/${state.pin}`);
  get(gameRef).then((snapshot) => {
    const game = snapshot.val();
    if (!game || !game.started) {
      alert('Quiz is not currently active.');
      return;
    }
    const question = game.quiz.questions[game.currentQuestion];
    const correct = answerIndex === question.answer;
    const playerRef = ref(db, `games/${state.pin}/players/${state.playerId}`);
    update(playerRef, {
      answered: true,
      score: correct ? (game.players?.[state.playerId]?.score || 0) + 100 : (game.players?.[state.playerId]?.score || 0),
      lastAnswer: answerIndex,
    });
  });
}

function listenGame() {
  if (!state.pin) return;
  const gameRef = ref(db, `games/${state.pin}`);
  if (gameListener) gameListener();
  gameListener = onValue(gameRef, (snapshot) => {
    const game = snapshot.val();
    if (!game) {
      alert('Game has ended or does not exist.');
      clearSession();
      showScreen('welcome');
      return;
    }
    state.quiz = game.quiz;
    state.currentQuestion = game.currentQuestion || 0;
    state.gameStarted = !!game.started;
    state.ended = !!game.ended;
    gamePinDisplay.textContent = state.pin || '----';

    if (state.ended) {
      showFinalScoreboard(state.players);
      return;
    }

    if (state.gameStarted) {
      showScreen('game');
      renderQuestion();
    } else {
      showScreen('lobby');
    }
    updateLobbyRoleUI();
  });
}

function listenPlayers() {
  if (!state.pin) return;
  const playersRef = ref(db, `games/${state.pin}/players`);
  if (playersListener) playersListener();
  playersListener = onValue(playersRef, (snapshot) => {
    const playersObj = snapshot.val() || {};
    const players = Object.entries(playersObj).map(([id, player]) => ({ id, ...player }));
    state.players = players;
    renderPlayers(players);
    updateLobbyRoleUI();
  });
}

function createLobby() {
  updateQuizFromEditor();
  if (!state.quiz || !state.quiz.questions.length) {
    alert('Add at least one question before hosting.');
    return;
  }
  state.pin = createPin();
  state.role = 'host';
  state.name = null;
  state.playerId = null;
  state.gameStarted = false;
  state.ended = false;
  saveSession();

  const gameRef = ref(db, `games/${state.pin}`);
  set(gameRef, {
    quiz: state.quiz,
    currentQuestion: 0,
    started: false,
    ended: false,
    createdAt: Date.now(),
  }).then(() => {
    listenGame();
    listenPlayers();
    gamePinDisplay.textContent = state.pin;
    renderPlayers([]);
    updateLobbyRoleUI();
    showScreen('lobby');
  });
}

function joinGame() {
  const name = playerNameInput.value.trim();
  const pin = gamePinInput.value.trim();
  if (!name || !validatePin(pin)) {
    alert('Enter a valid name and 4-digit PIN.');
    return;
  }
  const gameRef = ref(db, `games/${pin}`);
  get(gameRef).then((snapshot) => {
    if (!snapshot.exists()) {
      alert('Game PIN not found.');
      return;
    }
    const game = snapshot.val();
    if (game.started) {
      alert('Game already started. Wait for the next quiz.');
      return;
    }
    const playersRef = ref(db, `games/${pin}/players`);
    const newPlayerRef = push(playersRef);
    state.role = 'player';
    state.name = name;
    state.pin = pin;
    state.playerId = newPlayerRef.key;
    state.answered = false;
    saveSession();
    set(newPlayerRef, {
      name,
      score: 0,
      answered: false,
    }).then(() => {
      onDisconnect(newPlayerRef).remove();
      listenGame();
      listenPlayers();
      gamePinDisplay.textContent = pin;
      updateLobbyRoleUI();
      showScreen('lobby');
      alert(`Joined as ${name}. Waiting for the host to begin.`);
    });
  });
}

function startGame() {
  if (state.role !== 'host') return;
  if (!state.players.length) {
    alert('Add at least one player before starting the quiz.');
    return;
  }
  const gameRef = ref(db, `games/${state.pin}`);
  const gameUpdate = {
    started: true,
    ended: false,
    currentQuestion: 0,
  };
  state.players.forEach((player) => {
    gameUpdate[`players/${player.id}/score`] = 0;
    gameUpdate[`players/${player.id}/answered`] = false;
  });
  update(gameRef, gameUpdate);
}

function nextQuestion() {
  if (state.role !== 'host') return;
  const nextIndex = state.currentQuestion + 1;
  const gameRef = ref(db, `games/${state.pin}`);
  const updateData = {};
  if (nextIndex >= state.quiz.questions.length) {
    updateData.started = false;
    updateData.ended = true;
  } else {
    updateData.currentQuestion = nextIndex;
  }
  state.players.forEach((player) => {
    updateData[`players/${player.id}/answered`] = false;
  });
  update(gameRef, updateData);
}

function showFinalScoreboard(players) {
  const sorted = players.slice().sort((a, b) => b.score - a.score);
  scoreRows.innerHTML = sorted
    .map(
      (player, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${player.name}</td>
        <td>${player.score}</td>
      </tr>
    `
    )
    .join('');
  showScreen('scoreboard');
}

function updateLobbyRoleUI() {
  if (state.role === 'player') {
    beginGameBtn.disabled = true;
    beginGameBtn.textContent = 'Waiting for host';
  } else {
    beginGameBtn.disabled = false;
    beginGameBtn.textContent = 'Begin Quiz';
  }
  nextQuestionBtn.style.display = state.role === 'host' && state.gameStarted ? 'block' : 'none';
}

function restoreSession() {
  loadSession();
  if (!state.pin || !state.role) return;
  gamePinDisplay.textContent = state.pin;
  listenGame();
  listenPlayers();
  if (state.role === 'player') {
    showScreen('lobby');
  }
}

startHostBtn.addEventListener('click', createLobby);
joinGameBtn.addEventListener('click', joinGame);
beginGameBtn.addEventListener('click', startGame);
nextQuestionBtn.addEventListener('click', nextQuestion);
playAgainBtn.addEventListener('click', () => {
  clearSession();
  showScreen('welcome');
});
hostGameBtn.addEventListener('click', () => {
  state.role = 'host';
  state.quiz = {
    title: 'General knowledge challenge',
    questions: [
      { question: 'Which planet is known as the Red Planet?', choices: ['Mars', 'Venus', 'Jupiter', 'Mercury'], answer: 0 },
      { question: 'What is the capital of Japan?', choices: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], answer: 2 },
      { question: 'What is the main ingredient in guacamole?', choices: ['Potato', 'Avocado', 'Mango', 'Tomato'], answer: 1 },
      { question: 'How many continents are there?', choices: ['5', '6', '7', '8'], answer: 2 },
    ],
  };
  quizTitleInput.value = state.quiz.title;
  renderQuestionCards();
  renderPreview();
  showScreen('editor');
});
playGameBtn.addEventListener('click', () => {
  state.role = 'player';
  showScreen('join');
});
window.addEventListener('click', (event) => {
  if (event.target.matches('.back-btn')) {
    const target = event.target.dataset.target;
    if (target) showScreen(target);
  }
  if (event.target.dataset.action === 'remove') {
    const index = Number(event.target.dataset.index);
    state.quiz.questions.splice(index, 1);
    renderQuestionCards();
    renderPreview();
  }
});
window.addEventListener('input', (event) => {
  if (!event.target.closest('#questionList')) return;
  updateQuizFromEditor();
  renderPreview();
});
renderQuestionCards();
renderPreview();
restoreSession();
