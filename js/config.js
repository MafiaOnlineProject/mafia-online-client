export const API_BASE_URL = 'http://localhost:3000/api';

export const NIGHT_PHASE_DURATION_SEC = 45;

export const ROLES = {
  CIVILIAN: { id: 'CIVILIAN', name: 'Мирный житель', team: 'town' },
  MAFIA_BOSS: { id: 'MAFIA_BOSS', name: 'Босс Мафии', team: 'mafia' },
  MAFIA: { id: 'MAFIA', name: 'Мафия', team: 'mafia' },
  MISTRESS: { id: 'MISTRESS', name: 'Любовница', team: 'town' },
  DOCTOR: { id: 'DOCTOR', name: 'Доктор', team: 'town' },
  DETECTIVE: { id: 'DETECTIVE', name: 'Детектив', team: 'town' }
};

export const PHASES = {
  WAITING: {
    id: 'WAITING',
    title: 'Ожидание игроков',
    banner: 'Ожидаем, пока все игроки подключатся к комнате...'
  },
  NIGHT_MISTRESS: {
    id: 'NIGHT_MISTRESS',
    title: 'Ночь: Ход Любовницы',
    banner: 'Город засыпает. Просыпается Любовница и выбирает, к кому пойти в гости...',
    activeRole: 'MISTRESS',
    prompt: 'Выберите игрока, чтобы заблокировать его способность на эту ночь:'
  },
  NIGHT_DOCTOR: {
    id: 'NIGHT_DOCTOR',
    title: 'Ночь: Ход Доктора',
    banner: 'Любовница засыпает. Просыпается Доктор и решает, кого спасти...',
    activeRole: 'DOCTOR',
    prompt: 'Выберите игрока, которого хотите вылечить:'
  },
  NIGHT_MAFIA: {
    id: 'NIGHT_MAFIA',
    title: 'Ночь: Ход Мафии',
    banner: 'Доктор засыпает. Просыпается Мафия и выходит на охоту...',
    activeRole: ['MAFIA_BOSS', 'MAFIA'],
    prompt: 'Выберите жертву на эту ночь:'
  },
  NIGHT_DETECTIVE: {
    id: 'NIGHT_DETECTIVE',
    title: 'Ночь: Ход Детектива',
    banner: 'Мафия засыпает. Просыпается Детектив и ищет преступников...',
    activeRole: 'DETECTIVE',
    prompt: 'Выберите игрока для проверки его роли:'
  },
  DAY_VOTING: {
    id: 'DAY_VOTING',
    title: 'День: Обсуждение и голосование',
    banner: 'Город просыпается! Обсудите события ночи и проголосуйте против подозреваемого.',
    activeRole: 'ALL',
    prompt: 'Проголосуйте за исключение игрока из города:'
  },
  GAME_OVER: {
    id: 'GAME_OVER',
    title: 'Игра окончена',
    banner: 'Партия завершена! Ознакомьтесь с итогами ниже.'
  }
};