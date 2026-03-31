const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const games = {};
const connections = new Map();

function createPin() {
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (games[pin]);
  return pin;
}

function send(ws, message) {
  try {
    ws.send(JSON.stringify(message));
  } catch (err) {
    console.warn('Failed to send message', err);
  }
}

function broadcastToGame(game, message) {
  game.connections.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) send(client, message);
  });
}

function broadcastPlayerUpdate(game) {
  const payload = game.players.map((player) => ({ name: player.name, score: player.score, answered: player.answered }));
  if (game.host && game.host.readyState === WebSocket.OPEN) {
    send(game.host, { type: 'host:playerList', payload });
  }
  broadcastToGame(game, { type: 'game:update', payload });
}

function advanceQuestion(game) {
  const nextIndex = game.currentQuestion + 1;
  if (nextIndex >= game.quiz.questions.length) {
    game.started = false;
    const scores = game.players.slice().sort((a, b) => b.score - a.score);
    broadcastToGame(game, { type: 'game:ended', payload: { scores } });
    if (game.host && game.host.readyState === WebSocket.OPEN) {
      send(game.host, { type: 'host:ended', payload: { scores } });
    }
    return;
  }

  game.currentQuestion = nextIndex;
  game.players.forEach((player) => {
    player.answered = false;
  });

  const question = game.quiz.questions[game.currentQuestion];
  const questionPayload = {
    index: game.currentQuestion,
    total: game.quiz.questions.length,
    question: {
      text: question.question,
      choices: question.choices,
    },
  };
  broadcastToGame(game, { type: 'game:question', payload: questionPayload });
  if (game.host && game.host.readyState === WebSocket.OPEN) {
    send(game.host, { type: 'host:question', payload: questionPayload });
  }
}

function getGameByPin(pin) {
  return games[pin] || null;
}

wss.on('connection', (ws) => {
  connections.set(ws, { role: null, pin: null, name: null });

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      send(ws, { type: 'error', payload: { message: 'Invalid JSON.' } });
      return;
    }

    const { type, payload } = data;

    if (type === 'host:init') {
      if (!payload || !payload.quiz || !Array.isArray(payload.quiz.questions)) {
        send(ws, { type: 'error', payload: { message: 'Invalid quiz payload.' } });
        return;
      }
      const pin = createPin();
      const game = {
        pin,
        quiz: payload.quiz,
        host: ws,
        players: [],
        connections: [ws],
        currentQuestion: 0,
        started: false,
      };
      games[pin] = game;
      connections.set(ws, { role: 'host', pin, name: null });
      send(ws, { type: 'host:ready', payload: { pin, title: payload.quiz.title } });
    }

    if (type === 'player:join') {
      if (!payload || !payload.name || !payload.pin) {
        send(ws, { type: 'error', payload: { message: 'Name and PIN are required.' } });
        return;
      }
      const game = getGameByPin(payload.pin);
      if (!game) {
        send(ws, { type: 'error', payload: { message: 'Game PIN not found.' } });
        return;
      }
      if (game.started) {
        send(ws, { type: 'error', payload: { message: 'Game already started.' } });
        return;
      }
      if (game.players.find((player) => player.name.toLowerCase() === payload.name.toLowerCase())) {
        send(ws, { type: 'error', payload: { message: 'Name already joined.' } });
        return;
      }
      const player = { name: payload.name, score: 0, answered: false, ws };
      game.players.push(player);
      if (!game.connections.includes(ws)) game.connections.push(ws);
      connections.set(ws, { role: 'player', pin: payload.pin, name: payload.name });
      send(ws, { type: 'player:joined', payload: { pin: payload.pin, name: payload.name, players: game.players.map((p) => ({ name: p.name, score: p.score })) } });
      if (game.host && game.host.readyState === WebSocket.OPEN) {
        send(game.host, { type: 'host:playerList', payload: game.players.map((p) => ({ name: p.name, score: p.score, answered: p.answered })) });
      }
    }

    if (type === 'host:start') {
      const meta = connections.get(ws);
      if (!meta || meta.role !== 'host' || !meta.pin) {
        send(ws, { type: 'error', payload: { message: 'Only host can start the game.' } });
        return;
      }
      const game = getGameByPin(meta.pin);
      if (!game) {
        send(ws, { type: 'error', payload: { message: 'Game not found.' } });
        return;
      }
      if (game.players.length === 0) {
        send(ws, { type: 'error', payload: { message: 'Add at least one player before starting.' } });
        return;
      }
      game.started = true;
      game.currentQuestion = 0;
      game.players.forEach((player) => {
        player.score = 0;
        player.answered = false;
      });
      const question = game.quiz.questions[0];
      const questionPayload = {
        index: 0,
        total: game.quiz.questions.length,
        question: {
          text: question.question,
          choices: question.choices,
        },
      };
      broadcastToGame(game, { type: 'game:started', payload: { pin: game.pin } });
      broadcastToGame(game, { type: 'game:question', payload: questionPayload });
      if (game.host && game.host.readyState === WebSocket.OPEN) {
        send(game.host, { type: 'host:question', payload: questionPayload });
      }
      broadcastPlayerUpdate(game);
    }

    if (type === 'player:answer') {
      const meta = connections.get(ws);
      if (!meta || meta.role !== 'player' || !meta.pin) {
        send(ws, { type: 'error', payload: { message: 'You must join a game to answer.' } });
        return;
      }
      const game = getGameByPin(meta.pin);
      if (!game || !game.started) {
        send(ws, { type: 'error', payload: { message: 'Game is not active.' } });
        return;
      }
      const player = game.players.find((item) => item.name === meta.name);
      if (!player) {
        send(ws, { type: 'error', payload: { message: 'Player not found.' } });
        return;
      }
      if (player.answered) {
        send(ws, { type: 'error', payload: { message: 'Answer already submitted.' } });
        return;
      }
      const question = game.quiz.questions[game.currentQuestion];
      const isCorrect = Number(payload.answer) === Number(question.answer);
      if (isCorrect) player.score += 100;
      player.answered = true;
      send(ws, { type: 'player:answerResult', payload: { correct: isCorrect } });
      broadcastPlayerUpdate(game);
      const allAnswered = game.players.every((item) => item.answered);
      if (allAnswered) {
        setTimeout(() => advanceQuestion(game), 750);
      }
    }
  });

  ws.on('close', () => {
    const meta = connections.get(ws);
    if (!meta) return;
    const game = getGameByPin(meta.pin);
    if (game) {
      if (meta.role === 'host') {
        game.connections.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== ws) {
            send(client, { type: 'error', payload: { message: 'Host disconnected.' } });
          }
        });
        delete games[meta.pin];
      } else if (meta.role === 'player') {
        game.players = game.players.filter((player) => player.name !== meta.name);
        if (game.host && game.host.readyState === WebSocket.OPEN) {
          send(game.host, { type: 'host:playerList', payload: game.players.map((p) => ({ name: p.name, score: p.score, answered: p.answered })) });
        }
      }
    }
    connections.delete(ws);
  });
});

app.use(express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Quiz Blitz server listening on http://localhost:${port}`);
});
