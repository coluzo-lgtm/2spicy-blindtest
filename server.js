// 2 Spicy - Blind Test buzzer app
// Serveur temps réel : les joueurs buzzent depuis leur téléphone,
// l'hôte (Lucile) valide les points, l'écran affiche le tableau en direct.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, 'state.json');
const HOST_PASSWORD = process.env.HOST_PASSWORD || ''; // optionnel, voir README

app.use(express.static(path.join(__dirname, 'public')));

// URLs propres sans .html
app.get('/play', (req, res) => res.sendFile(path.join(__dirname, 'public', 'play.html')));
app.get('/screen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'screen.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));

// ---------- État du jeu ----------
// teams: { id: { id, name, color, score, lockedRounds, connected } }
// round: numéro de manche en cours
// buzzOpen: true si les joueurs peuvent buzzer
// queue: [{ teamId, ts }] ordre des buzz de la manche en cours
// judged: ids déjà jugés "faux" cette manche (retirés de la file)

function freshState() {
  return {
    teams: {},
    round: 1,
    buzzOpen: false,
    queue: [],
    lastEvent: null, // { type, teamId, points } pour les animations
  };
}

let state = freshState();

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.teams) state = parsed;
    }
  } catch (e) {
    console.error('Impossible de charger state.json, on repart de zéro.', e.message);
  }
}

let saveTimer = null;
function saveStateSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), () => {});
  }, 250);
}

loadState();

const COLORS = ['#ff3b6b', '#ff8c3b', '#ffd23b', '#3bffb0', '#3bc7ff', '#a03bff', '#ff3bd8', '#7cff3b'];

function pickColor(usedColors) {
  const free = COLORS.filter((c) => !usedColors.includes(c));
  if (free.length) return free[Math.floor(Math.random() * free.length)];
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function publicState() {
  // Ne jamais exposer les tokens (sécurité) et calculer "locked" à partir
  // de la manche en cours plutôt que de stocker un compteur qui se décale.
  const teams = {};
  for (const [id, t] of Object.entries(state.teams)) {
    teams[id] = {
      id: t.id,
      name: t.name,
      color: t.color,
      score: t.score,
      connected: t.connected,
      locked: !!(t.lockedUntilRound && state.round < t.lockedUntilRound),
    };
  }
  return {
    round: state.round,
    buzzOpen: state.buzzOpen,
    queue: state.queue,
    lastEvent: state.lastEvent,
    teams,
  };
}

function broadcastState() {
  io.emit('state', publicState());
  saveStateSoon();
}

function currentTeamId() {
  // premier de la file qui n'a pas encore été jugé "faux" cette manche
  return state.queue.length ? state.queue[0].teamId : null;
}

// ---------- Sockets ----------
io.on('connection', (socket) => {
  socket.emit('state', publicState());

  // --- Rejoindre en tant que joueur ---
  socket.on('join', ({ name, rejoinId, rejoinToken }) => {
    // Reconnexion (refresh de page, wifi qui saute...)
    if (rejoinId && state.teams[rejoinId] && state.teams[rejoinId].token === rejoinToken) {
      const team = state.teams[rejoinId];
      team.connected = true;
      socket.data.teamId = team.id;
      socket.join('team:' + team.id);
      socket.emit('joined', { teamId: team.id, token: team.token, team });
      broadcastState();
      return;
    }

    const cleanName = String(name || '').trim().slice(0, 24);
    if (!cleanName) {
      socket.emit('joinError', "Choisis un nom d'équipe.");
      return;
    }
    const exists = Object.values(state.teams).some(
      (t) => t.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      socket.emit('joinError', 'Ce nom est déjà pris, essaie autre chose.');
      return;
    }

    const id = crypto.randomBytes(6).toString('hex');
    const token = crypto.randomBytes(12).toString('hex');
    const usedColors = Object.values(state.teams).map((t) => t.color);
    const team = {
      id,
      name: cleanName,
      color: pickColor(usedColors),
      score: 0,
      lockedUntilRound: 0,
      connected: true,
      token,
    };
    state.teams[id] = team;
    socket.data.teamId = id;
    socket.join('team:' + id);
    socket.emit('joined', { teamId: id, token, team });
    broadcastState();
  });

  // --- Buzz ! ---
  socket.on('buzz', () => {
    const teamId = socket.data.teamId;
    if (!teamId || !state.teams[teamId]) return;
    if (!state.buzzOpen) return;
    const team = state.teams[teamId];
    if (team.lockedUntilRound && state.round < team.lockedUntilRound) return;
    if (state.queue.some((q) => q.teamId === teamId)) return; // déjà buzzé
    state.queue.push({ teamId, ts: Date.now() });
    broadcastState();
  });

  socket.on('disconnect', () => {
    const teamId = socket.data.teamId;
    if (teamId && state.teams[teamId]) {
      state.teams[teamId].connected = false;
      broadcastState();
    }
  });

  // ---------- Actions de l'hôte ----------
  function isHost() {
    return !HOST_PASSWORD || socket.data.isHost;
  }

  socket.on('hostAuth', (password) => {
    if (!HOST_PASSWORD || password === HOST_PASSWORD) {
      socket.data.isHost = true;
      socket.emit('hostAuthOk');
    } else {
      socket.emit('hostAuthError', 'Mot de passe incorrect.');
    }
  });

  socket.on('openBuzz', () => {
    if (!isHost()) return;
    state.buzzOpen = true;
    state.queue = [];
    broadcastState();
  });

  socket.on('nextRound', () => {
    if (!isHost()) return;
    state.round += 1;
    state.queue = [];
    state.buzzOpen = true;
    state.lastEvent = { type: 'round', round: state.round };
    broadcastState();
  });

  socket.on('judge', ({ points }) => {
    if (!isHost()) return;
    const teamId = currentTeamId();
    if (!teamId) return;
    const team = state.teams[teamId];
    if (!team) return;

    if (points === 2 || points === 1) {
      team.score += points;
      state.buzzOpen = false;
      state.lastEvent = { type: 'correct', teamId, points };
    } else {
      // faux : verrouillé pour la prochaine manche uniquement, retiré de la file
      team.lockedUntilRound = state.round + 2;
      state.queue.shift();
      state.lastEvent = { type: 'wrong', teamId };
    }
    broadcastState();
  });

  socket.on('adjustScore', ({ teamId, delta }) => {
    if (!isHost()) return;
    const team = state.teams[teamId];
    if (!team) return;
    team.score = Math.max(0, team.score + delta);
    broadcastState();
  });

  socket.on('removeTeam', ({ teamId }) => {
    if (!isHost()) return;
    delete state.teams[teamId];
    state.queue = state.queue.filter((q) => q.teamId !== teamId);
    broadcastState();
  });

  socket.on('addTeamManual', ({ name }) => {
    if (!isHost()) return;
    const cleanName = String(name || '').trim().slice(0, 24);
    if (!cleanName) return;
    const id = crypto.randomBytes(6).toString('hex');
    const usedColors = Object.values(state.teams).map((t) => t.color);
    state.teams[id] = {
      id,
      name: cleanName,
      color: pickColor(usedColors),
      score: 0,
      lockedUntilRound: 0,
      connected: false,
      token: crypto.randomBytes(12).toString('hex'),
    };
    broadcastState();
  });

  socket.on('resetGame', () => {
    if (!isHost()) return;
    state = freshState();
    broadcastState();
  });
});

server.listen(PORT, () => {
  console.log(`2 Spicy Blind Test — serveur lancé sur le port ${PORT}`);
});
