// Starfall Bastion - tuning constants. The arena is a fixed virtual field that is
// scaled to fit the window, so the game plays the same at any screen size.
export const ARENA_W = 1600;
export const ARENA_H = 1000;
export const STEP = 1 / 60;
export const BEST_KEY = 'starfall-bastion-best';

export const PLAYER = {
  radius: 16,
  speed: 330,
  hp: 100,
  fireInterval: 0.16,
  bulletSpeed: 860,
  bulletDamage: 12,
  bulletRadius: 5,
  dashTime: 0.16,
  dashSpeed: 1150,
  dashCooldown: 1.6,
  magnetRadius: 130,
};

export const COLORS = {
  bg: '#070a18',
  player: '#57f7ff',
  playerCore: '#e8feff',
  bullet: '#a5fbff',
  enemyBullet: '#ff9d5c',
  core: '#ffe066',
  repair: '#6dffa8',
  hud: '#d7f6ff',
  danger: '#ff5d7a',
};

// Enemy archetypes: hp, speed, radius, score and contact damage per kind.
export const ENEMIES = {
  drifter: { hp: 24, speed: 118, radius: 17, score: 50, damage: 12 },
  weaver: { hp: 16, speed: 205, radius: 13, score: 80, damage: 10 },
  spitter: { hp: 30, speed: 92, radius: 18, score: 120, damage: 10, fireInterval: 2.1, bulletSpeed: 330 },
  splitter: { hp: 55, speed: 74, radius: 27, score: 150, damage: 16 },
  mini: { hp: 8, speed: 235, radius: 9, score: 30, damage: 6 },
  boss: { hp: 1450, speed: 52, radius: 62, score: 2000, damage: 24, fireInterval: 1.5, bulletSpeed: 300 },
};

// Wave composition: how many of each kind spawn on wave n (1-based).
export function waveComp(n) {
  const boss = n % 5 === 0;
  return {
    drifter: 4 + n * 2,
    weaver: n >= 2 ? 2 + n : 0,
    spitter: n >= 3 ? Math.floor(n * 0.8) : 0,
    splitter: n >= 4 ? Math.floor((n - 2) * 0.7) : 0,
    boss: boss ? 1 : 0,
  };
}
export function waveTotal(n) {
  const c = waveComp(n);
  return c.drifter + c.weaver + c.spitter + c.splitter + c.boss;
}
