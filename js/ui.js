import { qs, qsa, createEl, clearEl } from './domHelpers.js';
import { ROLES, DEFAULT_ROOM_SETTINGS, PLAYER_COLORS, PHASES } from './config.js';
import { state } from './state.js';

export function showScreen(screenId) {
  qsa('.screen').forEach((sec) => sec.classList.add('hidden'));
  const target = qs(`#${screenId}`);
  if (target) target.classList.remove('hidden');
}

export function renderHeader() {
  const badge = qs('#user-badge');
  const usernameEl = qs('#header-username');

  if (state.user) {
    usernameEl.textContent = state.user.username;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

export function renderRoomsList(rooms, onJoinRoom) {
  const container = qs('#rooms-list');
  clearEl(container);

  if (!rooms.length) {
    container.appendChild(
      createEl('p', {className: 'subtitle', text: 'Активных комнат пока нет. Создайте первую!'})
    );
    return;
  }

  rooms.forEach((room) => {
    const statusLabel =
    room.status === 'WAITING'
      ? 'Войти'
      : room.phase === 'GAME_OVER'
        ? 'Завершено'
        : 'Идёт игра';

    const joinBtn = createEl('button', {
      className: 'btn btn-primary btn-small',
      text: statusLabel
    });
    if (room.status !== 'WAITING') joinBtn.disabled = true;
    joinBtn.addEventListener('click', () => onJoinRoom(room.id));

    const card = createEl('div', {
      className: 'card',
      children: [
        createEl('h3', {text: room.name}),
        createEl('p', {
          className: 'subtitle',
          text: `Код: ${room.code} :|: Игроков: ${room.playerCount}/${room.maxPlayers || 12}`
        }),
        joinBtn
      ]
    });

    container.appendChild(card);
  });
}

export function renderWaitingRoom(room, onKickPlayer) {
  const settings = { ...DEFAULT_ROOM_SETTINGS, ...room.settings };
  const maxPlayers = settings.maxPlayers;
  const amIHost = room.hostId === state.user?.id;

  qs('#waiting-room-title').textContent = room.name;
  qs('#waiting-room-code').textContent = room.code;
  qs('#waiting-count').textContent = room.players.length;
  qs('#waiting-max-count').textContent = maxPlayers;

  const settingsInfo = qs('#waiting-room-settings');
  if (settingsInfo) {
    const infoParts = [
      `День: ${settings.dayDurationSec}с`,
      `Ночь: ${settings.nightDurationSec}с`
    ];
    if (maxPlayers >= 8) {
      infoParts.push(settings.enableMistress ? 'Любовница: вкл' : 'Любовница: выкл');
    }
    if (maxPlayers >= 12) {
      infoParts.push(settings.enableManiac ? 'Маньяк: вкл' : 'Маньяк: выкл (3-я Мафия)');
    }

    settingsInfo.textContent = infoParts.join(' :|: ');
  }

  const list = qs('#waiting-players-list');
  clearEl(list);

  room.players.forEach((player) => {
    const isPlayerHost = player.id === room.hostId;
    const rightSide = [
      createEl('span', {
        className: 'badge',
        text: isPlayerHost ? 'Создатель' : player.isBot ? 'Бот' : 'Готов'
      })
    ];

    if (amIHost && !isPlayerHost && onKickPlayer) {
      const kickBtn = createEl('button', {
        attrs: { type: 'button' },
        className: 'btn-kick',
        text: '✕'
      });
      kickBtn.title = 'Исключить из комнаты';
      kickBtn.addEventListener('click', () => onKickPlayer(player.id));
      rightSide.push(kickBtn);
    }

    const li = createEl('li', {
      className: 'waiting-player-item',
      children: [
        createEl('span', { text: player.username }),
        createEl('div', { className: 'btn-group', children: rightSide })
      ]
    });
    list.appendChild(li);
  });

  const hostControls = qs('#host-controls');
  const addBotBtn = qs('#add-bot-btn');
  const startBtn = qs('#start-game-btn');

  if (amIHost) {
    hostControls.classList.remove('hidden');
    startBtn.disabled = room.players.length < 4;
    if (addBotBtn) addBotBtn.disabled = room.players.length >= maxPlayers;
  } else {
    hostControls.classList.add('hidden');
  }
}

export function updateTimerDisplay(phaseEndsAt) {
  const timerEl = qs('#game-timer');
  if (!timerEl) return;
  if (!phaseEndsAt) {
    timerEl.textContent = '--:--';
    return;
  }
  const nowOnServer = Date.now() + (state.clockOffset || 0);
  const remainingSec = Math.max(0, Math.ceil((phaseEndsAt - nowOnServer) / 1000));
  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

export function formatText(text) {
  return String(text || '').replace(
    /\{\{ROLE:([A-Z_]+)\}\}/g,
    (_, roleId) => ROLES[roleId]?.name || roleId
  );
}

function getNightSleepPrefix(room) {
  const count = room.players.length;
  const s = { ...DEFAULT_ROOM_SETTINGS, ...room.settings };

  const activePhases = [];
  if (count >= 8 && s.enableMistress) {
    activePhases.push({ phase: 'NIGHT_MISTRESS', sleep: 'Любовница засыпает. ' });
  }
  activePhases.push({ phase: 'NIGHT_DOCTOR', sleep: 'Доктор засыпает. ' });
  activePhases.push({ phase: 'NIGHT_MAFIA', sleep: 'Мафия засыпает. ' });
  if (count >= 12 && s.enableManiac) {
    activePhases.push({ phase: 'NIGHT_MANIAC', sleep: 'Маньяк засыпает. ' });
  }
  activePhases.push({ phase: 'NIGHT_DETECTIVE', sleep: 'Детектив засыпает. ' });

  const idx = activePhases.findIndex((item) => item.phase === room.phase);
  if (idx <= 0) return 'Город засыпает. ';
  return activePhases[idx - 1].sleep;
}

export function renderChronicle(room) {
  const box = qs('#chronicle-list');
  if (!box) return;

  const log = room.log || [];
  const lastId = log.length ? log[log.length - 1].id : 0;
  const key = `${room.id}:${log.length}:${lastId}`;
  if (box.dataset.key === key) return; // ничего не изменилось, не трогаем DOM и прокрутку
  box.dataset.key = key;

  const prevTop = box.scrollTop;
  const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;

  clearEl(box);
  let currentDay = null;
  log.forEach((entry) => {
    if (entry.day !== currentDay) {
      currentDay = entry.day;
      box.appendChild(createEl('div', { className: 'chronicle-day-title', text: `День ${entry.day}` }));
    }
    box.appendChild(createEl('div', {
      className: `chronicle-entry chronicle-${entry.type || 'info'}`,
      text: formatText(entry.text)
    }));
  });

  box.scrollTop = wasAtBottom ? box.scrollHeight : prevTop;
}

export function renderGameRoom(room, onSelectTarget) {
  const phaseCfg = PHASES[room.phase] || PHASES.WAITING;
  const me = room.players.find((p) => p.id === state.user?.id);
  const savedTargetId = room.phase === 'DAY_VOTING' ? room.dayVotes?.[me?.id] : null;
  const isGameOver = room.phase === 'GAME_OVER';

  qs('#game-day-counter').textContent = `День ${room.dayNumber || 1}`;
  qs('#game-phase-title').textContent = phaseCfg.title;

  updateTimerDisplay(room.phaseEndsAt);

  renderChronicle(room);

  let bannerText = room.lastAnnouncement;
  if (!bannerText) {
    const prefix = room.phase.startsWith('NIGHT_') ? getNightSleepPrefix(room) : '';
    bannerText = `${prefix}${phaseCfg.banner}`;
  }

  bannerText = formatText(bannerText);
  qs('#narrator-banner').textContent = bannerText;

  const myRoleObj = me?.role ? ROLES[me.role] : null;
  qs('#my-role-name').textContent = myRoleObj ? myRoleObj.name : 'Неизвестно';

  const activeBoss = room.players.find((p) => p.isAlive && p.role === 'MAFIA_BOSS');
  const activeShooter = activeBoss || room.players.find((p) => p.isAlive && p.role === 'MAFIA');

  const alreadyActedOnServer = Boolean(
    me &&
      (room.phase === 'DAY_VOTING'
        ? room.dayVotes?.[me.id]
        : phaseCfg.actionKey && room.nightActions?.[phaseCfg.actionKey])
  );

  const hasSubmitted = state.actionSubmitted || alreadyActedOnServer;

  let isMyTurn = false;
  if (me && me.isAlive && !isGameOver && !hasSubmitted) {
    if (phaseCfg.activeRole === 'ALL') {
      isMyTurn = true;
    } else if (room.phase === 'NIGHT_MAFIA') {
      isMyTurn = activeShooter?.id === me.id;
    } else {
      isMyTurn = phaseCfg.activeRole === me.role;
    }
  }

  const table = qs('#game-table');
  clearEl(table);

  const playerColorMap = new Map();
  room.players.forEach((p, idx) => {
    playerColorMap.set(p.id, PLAYER_COLORS[idx % PLAYER_COLORS.length]);
  });

  const votersByTarget = {};
  if ((room.phase === 'DAY_RESULTS' || room.phase === 'GAME_OVER') && room.dayVotes) {
    Object.entries(room.dayVotes).forEach(([voterIdStr, targetId]) => {
      const voter = room.players.find((p) => p.id === Number(voterIdStr));
      if (voter) {
        if (!votersByTarget[targetId]) votersByTarget[targetId] = [];
        votersByTarget[targetId].push({
          username: voter.username,
          color: playerColorMap.get(voter.id) || '#9ca3af'
        });
      }
    });
  }

  room.players.forEach((player) => {
    const isMe = player.id === me?.id;
    const isMafiaAlly =
      (me?.role === 'MAFIA_BOSS' || me?.role === 'MAFIA') &&
      (player.role === 'MAFIA_BOSS' || player.role === 'MAFIA');
    const isSelected = (state.selectedTargetId || savedTargetId) === player.id;
    
    const seatClasses = ['player-seat'];
    if (!player.isAlive) seatClasses.push('dead');
    if (isSelected) seatClasses.push('selected');

    const hasAlibi = room.phase === 'DAY_VOTING' && room.dayAlibiId === player.id;
    const isRepeatedTarget =
      (room.phase === 'NIGHT_MISTRESS' && room.lastTargets?.MISTRESS === player.id) ||
      (room.phase === 'NIGHT_DOCTOR' && room.lastTargets?.DOCTOR === player.id);

    let statusText = 'В игре';
    if (isGameOver || !player.isAlive) {
      const stateLabel = player.isLeft ? 'Покинул игру' : player.isAlive ? 'Выжил' : 'Выбыл';
      statusText = `${stateLabel} (${ROLES[player.role]?.name || 'Роль скрыта'})`;
    } else if (hasAlibi) {
      statusText = 'Алиби (нельзя голосовать)';
    } else if (isRepeatedTarget && isMyTurn) {
      statusText = 'Выбран прошлой ночью';
    } else if (isMe) {
      statusText = 'Это вы';
    } else if (isMafiaAlly) {
      statusText = 'Союзник (Мафия)';
    }

    const playerColor = playerColorMap.get(player.id);
    const voters = votersByTarget[player.id] || [];

    const voteBadgesEl = createEl('div', {
      className: 'vote-badges',
      children: voters.map((v) => {
        const dot = createEl('span', { className: 'vote-dot' });
        dot.style.backgroundColor = v.color;
        dot.title = `Проголосовал: ${v.username}`;
        return dot;
      })
    });

    const seat = createEl('div', {
      className: seatClasses.join(' '),
      dataset: { playerId: String(player.id) },
      children: [
        createEl('div', {
          className: 'avatar',
          text: player.username.slice(0, 2).toUpperCase()
        }),
        createEl('strong', { text: player.username }),
        createEl('span', { className: 'status-label', text: statusText }),
        voteBadgesEl
      ]
    });
    seat.style.setProperty('--player-color', playerColor);
    seat.querySelector('.avatar').style.borderColor = playerColor;

    const canSelectSelf = room.phase === 'NIGHT_DOCTOR';
    const isValidTarget =
      player.isAlive &&
      (canSelectSelf || !isMe) &&
      !(room.phase === 'NIGHT_MAFIA' && isMafiaAlly) &&
      !hasAlibi &&
      !isRepeatedTarget;

    if (isMyTurn && isValidTarget) {
      seat.addEventListener('click', () => onSelectTarget(player.id));
    }

    table.appendChild(seat);
  });

  const idleEl = qs('#action-idle');

  let idleText = '';
  if (!isGameOver && !isMyTurn) {
    if (!me || !me.isAlive) {
      idleText = 'Вы выбыли из игры. Наблюдайте за ходом партии.';
    } else if (hasSubmitted) {
      idleText = 'Выбор сделан. Ожидайте остальных игроков...';
    } else if (room.phase === 'DAY_RESULTS') {
      idleText = 'Подводим итоги голосования...';
    } else {
      idleText = 'Сейчас ход других игроков. Ожидайте...';
    }
  }

  idleEl.textContent = idleText;
  idleEl.classList.toggle('hidden', !idleText);

  const actionPanel = qs('#action-panel');
  const confirmBtn = qs('#confirm-action-btn');
  if (isMyTurn) {
    actionPanel.classList.remove('hidden');
    qs('#action-prompt').textContent = phaseCfg.prompt;
    confirmBtn.disabled = !state.selectedTargetId;
  } else {
    actionPanel.classList.add('hidden');
  }

  const gameOverPanel = qs('#game-over-panel');
  const restartBtn = qs('#restart-game-btn');
  if (isGameOver) {
    gameOverPanel.classList.remove('hidden');
    restartBtn.classList.toggle('hidden', room.hostId !== state.user?.id);
  } else {
    gameOverPanel.classList.add('hidden');
  }
}
