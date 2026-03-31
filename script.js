const screens = document.querySelectorAll('.screen');
const welcomeScreen = document.getElementById('welcome');
const editorScreen = document.getElementById('editor');
const joinScreen = document.getElementById('join');
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game');
const scoreboardScreen = document.getElementById('scoreboard');

const hostGameBtn = document.getElementById('hostGameBtn');
const playGameBtn = document.getElementById('playGameBtn');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const startHostBtn = document.getElementById('startHostBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const beginGameBtn = document.getElementById('beginGameBtn');
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
  quiz: null,
  players: [],
  gamePin: '',
  currentQuestion: 0,
  countdown: 10,
  timerId: null,
};

const sampleQuiz = {
  title: 'Quiz Blitz Sample',
  questions: [
    {
      question: 'Which planet is known as the Red Planet?',
      choices: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
      answer: 0,
    },
    {
      question: 'What is the capital of Japan?',
      choices: ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'],
      answer: 2,
    },
    {
      question: 'What is the main ingredient in guacamole?',
      choices: ['Potato', 'Avocado', 'Mango', 'Tomato'],
      answer: 1,
    },
    {
      question: 'How many continents are there?',
      choices: ['5', '6', '7', '8'],
      answer: 2,
    },
  ],
};

function showScreen(id) {
  screens.forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function formatPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function loadState() {
  const saved = localStorage.getItem('quizBlitzState');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (parsed.quiz) state.quiz = parsed.quiz;
    if (Array.isArray(parsed.players)) state.players = parsed.players;
    if (typeof parsed.gamePin === 'string') state.gamePin = parsed.gamePin;
    if (typeof parsed.currentQuestion === 'number') state.currentQuestion = parsed.currentQuestion;
    if (state.gamePin && gamePinInput) {
      gamePinInput.value = state.gamePin;
    }
    if (state.gamePin && gamePinDisplay) {
      gamePinDisplay.textContent = state.gamePin;
    }
    return parsed;
  } catch (error) {
    console.warn('Unable to parse saved quiz state', error);
    return null;
  }
}

function saveState() {
  localStorage.setItem(
    'quizBlitzState',
    JSON.stringify({ quiz: state.quiz, players: state.players, gamePin: state.gamePin, currentQuestion: state.currentQuestion })
  );
}

function clearSavedState() {
  localStorage.removeItem('quizBlitzState');
}

function buildQuizEditor(initialQuiz) {
  const quiz = initialQuiz ? JSON.parse(JSON.stringify(initialQuiz)) : {
    title: 'New Quiz',
    questions: [],
  };
  state.quiz = quiz;
  quizTitleInput.value = quiz.title;
  renderQuestionCards();
  renderPreview();
}

function renderQuestionCards() {
  questionList.innerHTML = '';

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
        ${item.choices.map((choice, choiceIndex) => `
          <option value="${choiceIndex}" ${choiceIndex === item.answer ? 'selected' : ''}>${choice}</option>
        `).join('')}
      </select>
      <div style="display:grid;gap:10px;margin-top:14px;">
        ${item.choices.map((choice, choiceIndex) => `
          <div>
            <label>Choice ${choiceIndex + 1}</label>
            <input data-role="choice" data-index="${idx}" data-choice="${choiceIndex}" value="${choice}" />
          </div>
        `).join('')}
      </div>
    `;
    questionList.appendChild(card);
  });

  if (state.quiz.questions.length === 0) {
    questionList.innerHTML = '<p class="label-text">No questions yet. Add one to start the game.</p>';
  }
}

function addQuestion() {
  state.quiz.questions.push({
    question: 'Type your question here',
    choices: ['Option A', 'Option B', 'Option C', 'Option D'],
    answer: 0,
  });
  renderQuestionCards();
  renderPreview();
}

function updateQuizFromEditor() {
  const title = quizTitleInput.value.trim();
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

function removeQuestion(index) {
  state.quiz.questions.splice(index, 1);
  renderQuestionCards();
  renderPreview();
}

function renderPreview() {
  const current = state.quiz.questions[0] || {
    question: 'Preview question will show here',
    choices: ['Option A', 'Option B', 'Option C', 'Option D'],
  };
  previewCard.innerHTML = `
    <div style="font-size:1.1rem;font-weight:700;">${current.question}</div>
    <div class="answers-grid">
      ${current.choices.map((choice) => `<div class="answer-button" style="cursor:default;">${choice}</div>`).join('')}
    </div>
  `;
}

function createLobby() {
  updateQuizFromEditor();
  if (state.quiz.questions.length === 0) {
    alert('Add at least one question before hosting.');
    return;
  }
  state.gamePin = formatPin();
  state.players = [];
  gamePinDisplay.textContent = state.gamePin;
  renderPlayers();
  saveState();
  showScreen('lobby');
}

function renderPlayers() {
  playerList.innerHTML = '';
  if (state.players.length === 0) {
    playerList.innerHTML = '<li class="label-text">No players joined yet. Use the PIN to invite them.</li>';
    return;
  }
  state.players.forEach((player) => {
    const li = document.createElement('li');
    li.textContent = `${player.name} — ${player.score} pts`;
    playerList.appendChild(li);
  });
}

function joinGame() {
  loadState();

  const name = playerNameInput.value.trim();
  const pin = gamePinInput.value.trim();
  if (!name || pin.length !== 4) {
    alert('Enter a valid name and 4-digit PIN.');
    return;
  }
  if (!state.gamePin || pin !== state.gamePin) {
    alert('Game PIN is not active or does not match.');
    return;
  }
  if (state.players.find((player) => player.name.toLowerCase() === name.toLowerCase())) {
    alert('A player with that name already joined.');
    return;
  }
  state.players.push({ name, score: 0, answers: [] });
  saveState();
  playerNameInput.value = '';
  renderPlayers();
  alert(`${name} joined the quiz!`);
}

function startGame() {
  if (state.players.length === 0) {
    const joinAnyway = confirm('No players have joined yet. Start solo play?');
    if (!joinAnyway) return;
    state.players.push({ name: 'Player 1', score: 0, answers: [] });
  }

  state.currentQuestion = 0;
  state.quiz = state.quiz || sampleQuiz;
  state.quiz.title = quizTitleInput.value.trim() || state.quiz.title;
  state.players.forEach((player) => {
    player.score = 0;
    player.answers = [];
  });
  showScreen('game');
  renderQuestion();
}

function renderQuestion() {
  const quiz = state.quiz;
  const questionIndex = state.currentQuestion;
  const question = quiz.questions[questionIndex];

  gameTitle.textContent = quiz.title;
  progressText.textContent = `Question ${questionIndex + 1} of ${quiz.questions.length}`;
  nextQuestionText.textContent = questionIndex + 1;
  questionText.textContent = question.question;
  answersGrid.innerHTML = '';

  question.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = choice;
    button.dataset.index = index;
    button.addEventListener('click', () => chooseAnswer(index));
    answersGrid.appendChild(button);
  });

  state.countdown = 12;
  timerFill.style.width = '100%';
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.countdown -= 1;
    const percent = Math.max(0, (state.countdown / 12) * 100);
    timerFill.style.width = `${percent}%`;
    if (state.countdown <= 0) {
      clearInterval(state.timerId);
      lockAnswers();
      settleAnswer(null);
    }
  }, 1000);
}

function lockAnswers() {
  answersGrid.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
}

function chooseAnswer(choiceIndex) {
  lockAnswers();
  clearInterval(state.timerId);
  settleAnswer(choiceIndex);
}

function settleAnswer(choiceIndex) {
  const question = state.quiz.questions[state.currentQuestion];
  const isCorrect = choiceIndex === question.answer;
  const selectedButtons = answersGrid.querySelectorAll('button');
  selectedButtons.forEach((button) => {
    const idx = Number(button.dataset.index);
    if (idx === question.answer) {
      button.classList.add('correct');
    }
    if (choiceIndex !== null && idx === choiceIndex && idx !== question.answer) {
      button.classList.add('wrong');
    }
  });

  const scoreDelta = isCorrect ? 100 + state.countdown * 10 : 0;
  const player = state.players[0];
  player.score += scoreDelta;
  player.answers.push({ question: question.question, correct: isCorrect, chosen: choiceIndex });

  setTimeout(() => {
    state.currentQuestion += 1;
    if (state.currentQuestion >= state.quiz.questions.length) {
      showScoreboard();
    } else {
      renderQuestion();
    }
  }, 1100);
}

function showScoreboard() {
  showScreen('scoreboard');
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  scoreRows.innerHTML = sortedPlayers
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
}

function resetToWelcome() {
  state = { quiz: sampleQuiz, players: [], gamePin: '', currentQuestion: 0, countdown: 10, timerId: null };
  clearSavedState();
  buildQuizEditor(sampleQuiz);
  showScreen('welcome');
}

hostGameBtn.addEventListener('click', () => {
  buildQuizEditor(sampleQuiz);
  showScreen('editor');
});

playGameBtn.addEventListener('click', () => {
  state.quiz = sampleQuiz;
  quizTitleInput.value = sampleQuiz.title;
  state.gamePin = formatPin();
  state.players = [];
  saveState();
  gamePinInput.value = state.gamePin;
  showScreen('join');
});

addQuestionBtn.addEventListener('click', () => {
  addQuestion();
});

startHostBtn.addEventListener('click', createLobby);
joinGameBtn.addEventListener('click', joinGame);
beginGameBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', resetToWelcome);

window.addEventListener('click', (event) => {
  if (event.target.matches('.back-btn')) {
    const target = event.target.dataset.target;
    if (target) showScreen(target);
  }
  if (event.target.dataset.action === 'remove') {
    const index = Number(event.target.dataset.index);
    removeQuestion(index);
  }
});

window.addEventListener('input', (event) => {
  if (!event.target.closest('#questionList')) return;

  updateQuizFromEditor();
  renderPreview();

  const target = event.target;
  if (target.dataset.role === 'choice') {
    const questionIndex = Number(target.dataset.index);
    const choiceIndex = Number(target.dataset.choice);
    const matchingSelect = questionList.querySelector(`select[data-index="${questionIndex}"]`);
    if (matchingSelect) {
      const option = matchingSelect.querySelector(`option[value="${choiceIndex}"]`);
      if (option) option.textContent = target.value || `Choice ${choiceIndex + 1}`;
    }
  }
});

window.addEventListener('storage', (event) => {
  if (event.key !== 'quizBlitzState') return;
  loadState();
  if (gamePinInput) gamePinInput.value = state.gamePin || '';
  if (gamePinDisplay) gamePinDisplay.textContent = state.gamePin || '----';
  renderPlayers();
});

loadState();
if (state.gamePin && gamePinInput) {
  gamePinInput.value = state.gamePin;
}
if (state.gamePin && gamePinDisplay) {
  gamePinDisplay.textContent = state.gamePin;
}
buildQuizEditor(state.quiz || sampleQuiz);
