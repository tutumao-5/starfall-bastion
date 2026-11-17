// All drawing: the arena, ships, effects, HUD and the four screens. The world
// is a fixed 1600x1000 field scaled to fit the window; nothing here mutates
// game state.
import { ARENA_H, ARENA_W, COLORS } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const starRand = createRandom(1337);
const STARS = Array.from({ length: 170 }, () => ({ x: starRand.range(0, ARENA_W), y: starRand.range(0, ARENA_H), r: starRand.range(0.6, 2.1), tw: starRand.range(0, 6.28) }));
const NEBULA = [
  { x: 300, y: 220, r: 340, c: 'rgba(64,40,140,0.20)' },
  { x: 1280, y: 760, r: 420, c: 'rgba(16,80,110,0.18)' },
  { x: 900, y: 180, r: 260, c: 'rgba(120,30,80,0.12)' },
  { x: 420, y: 830, r: 300, c: 'rgba(20,60,120,0.14)' },
];

const KIND_STYLE = {
  drifter: { color: '#ff5da2', sides: 4 },
  weaver: { color: '#ffb84d', sides: 3 },
  spitter: { color: '#b98cff', sides: 5 },
  splitter: { color: '#6dffa8', sides: 6 },
  mini: { color: '#ff7a5c', sides: 3 },
  boss: { color: '#ff5d7a', sides: 6 },
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const w = canvas.width, h = canvas.height;
    const scale = Math.min(w / ARENA_W, h / ARENA_H);
    return { scale, ox: (w - ARENA_W * scale) / 2, oy: (h - ARENA_H * scale) / 2 };
  }

  function polygon(x, y, r, sides, rot) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawShip(x, y, angle, scale, alpha, hurt) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = COLORS.player; ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(-14, 13); ctx.lineTo(-8, 0); ctx.lineTo(-14, -13); ctx.closePath();
    ctx.fillStyle = hurt ? '#ff8fa5' : COLORS.player;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(4, 0, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.playerCore; ctx.fill();
    ctx.restore();
  }

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, ARENA_H);
    g.addColorStop(0, '#070a18'); g.addColorStop(0.5, '#0a0e24'); g.addColorStop(1, '#060814');
    ctx.fillStyle = g; ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    for (const n of NEBULA) {
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, n.c); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.strokeStyle = 'rgba(90,140,220,0.06)'; ctx.lineWidth = 1;
    for (let x = 100; x < ARENA_W; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); ctx.stroke(); }
    for (let y = 100; y < ARENA_H; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); ctx.stroke(); }
    for (const s of STARS) {
      const a = 0.35 + 0.3 * Math.sin(t * 1.4 + s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(87,247,255,0.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, ARENA_W - 12, ARENA_H - 12);
  }

  function drawEnemy(e, t) {
    const st = KIND_STYLE[e.kind];
    const scaleIn = e.spawnT > 0 ? 1 - e.spawnT / 0.45 : 1;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = 0.35 + 0.65 * scaleIn;
    ctx.scale(scaleIn, scaleIn);
    ctx.shadowColor = st.color; ctx.shadowBlur = 14;
    polygon(0, 0, e.radius, st.sides, e.angle + t * (e.kind === 'boss' ? 0.25 : 0.9));
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : st.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    polygon(0, 0, e.radius * 0.55, st.sides, -(e.angle + t * 0.6));
    ctx.fillStyle = 'rgba(10,10,26,0.55)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#ffd7e6'; ctx.fill();
    ctx.restore();
    if ((e.kind === 'spitter' || e.kind === 'splitter') && e.hp < e.maxHp && e.spawnT <= 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(e.x - 20, e.y - e.radius - 12, 40, 4);
      ctx.fillStyle = '#6dffa8'; ctx.fillRect(e.x - 20, e.y - e.radius - 12, 40 * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  function drawWorld(world, t) {
    drawBackground(t);
    // Pickups.
    for (const pk of world.pickups) {
      const pulse = 1 + Math.sin(t * 5 + pk.x) * 0.15;
      ctx.save(); ctx.translate(pk.x, pk.y);
      if (pk.kind === 'core') {
        ctx.rotate(t * 2.2); ctx.scale(pulse, pulse);
        ctx.shadowColor = COLORS.core; ctx.shadowBlur = 12;
        ctx.fillStyle = COLORS.core;
        ctx.fillRect(-6, -6, 12, 12);
      } else {
        ctx.scale(pulse, pulse);
        ctx.shadowColor = COLORS.repair; ctx.shadowBlur = 12;
        ctx.fillStyle = COLORS.repair;
        ctx.fillRect(-3.5, -10, 7, 20); ctx.fillRect(-10, -3.5, 20, 7);
      }
      ctx.restore();
    }
    // Particles.
    for (const pt of world.particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      if (pt.type === 'ghost') drawShip(pt.x, pt.y, pt.angle, 1, a * 0.35, false);
      else {
        ctx.globalAlpha = a;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      }
    }
    ctx.globalAlpha = 1;
    // Enemies, then the player, then bullets on top.
    for (const e of world.enemies) drawEnemy(e, t);
    const p = world.player;
    if (p.alive) {
      const blink = p.hurtCd > 0.35 && Math.floor(t * 18) % 2 === 0;
      drawShip(p.x, p.y, p.angle, 1, blink ? 0.35 : 1, p.hurtCd > 0.3);
      // Aim guide.
      ctx.strokeStyle = 'rgba(87,247,255,0.20)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26);
      ctx.lineTo(p.x + Math.cos(p.angle) * 44, p.y + Math.sin(p.angle) * 44); ctx.stroke();
    }
    for (const b of world.bullets) {
      ctx.save(); ctx.shadowColor = COLORS.bullet; ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.bullet;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const b of world.ebullets) {
      if (b.delay > 0) continue;
      ctx.save(); ctx.shadowColor = COLORS.enemyBullet; ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.enemyBullet;
      ctx.beginPath(); ctx.arc(b.x, b.y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // Floating texts.
    ctx.textAlign = 'center';
    for (const tx of world.texts) {
      ctx.globalAlpha = Math.min(1, tx.life / 0.45);
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.str, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
  }

  function bar(x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  function drawHUD(world, muted) {
    const p = world.player;
    ctx.textAlign = 'left';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hud;
    ctx.fillText('HULL', 24, 34);
    const hpFrac = p.hp / p.maxHp;
    bar(24, 42, 240, 13, hpFrac, hpFrac > 0.3 ? '#6dffa8' : COLORS.danger);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 24, 72);

    ctx.textAlign = 'center';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(`WAVE ${world.wave}`, ARENA_W / 2, 38);
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(215,246,255,0.75)';
    ctx.fillText(`hostiles left: ${world.enemiesLeft()}`, ARENA_W / 2, 60);
    if (world.boss) {
      ctx.fillStyle = COLORS.hud; ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('DREADNOUGHT', ARENA_W / 2, 84);
      bar(ARENA_W / 2 - 190, 92, 380, 9, world.boss.hp / world.boss.maxHp, COLORS.danger);
    }

    ctx.textAlign = 'right';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hud;
    ctx.fillText(`${world.score}`, ARENA_W - 24, 38);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(215,246,255,0.75)';
    ctx.fillText('SCORE', ARENA_W - 24, 58);
    if (world.combo >= 3) {
      const mult = (1 + Math.min(world.combo, 40) * 0.05).toFixed(2);
      ctx.fillStyle = '#ffe066';
      ctx.font = '800 19px system-ui, sans-serif';
      ctx.fillText(`COMBO x${mult}`, ARENA_W - 24, 88);
      bar(ARENA_W - 124, 96, 100, 5, world.comboT / 2.5, '#ffe066');
    }

    ctx.textAlign = 'left';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = COLORS.hud;
    ctx.fillText('DASH', 24, ARENA_H - 44);
    bar(24, ARENA_H - 36, 110, 8, 1 - Math.max(0, p.dashCd) / (1.6 * world.mods.dashCd), '#57f7ff');
    ctx.textAlign = 'right';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(215,246,255,0.55)';
    ctx.fillText(`WASD move · mouse aim · click shoot · SHIFT dash · P pause · M ${muted ? 'unmute' : 'mute'}`, ARENA_W - 24, ARENA_H - 22);
  }

  function centerText(str, y, font, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText(str, ARENA_W / 2, y);
    ctx.globalAlpha = 1;
  }

  function drawTitle(world, t, best) {
    drawWorld(world, t);
    ctx.fillStyle = 'rgba(4,6,16,0.45)'; ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    centerText('STARFALL', 330, '900 96px system-ui, sans-serif', '#57f7ff');
    centerText('BASTION', 428, '900 96px system-ui, sans-serif', '#d7f6ff');
    centerText('Hold the line against the swarm. Survive the waves, upgrade your ship,', 486, '500 19px system-ui, sans-serif', 'rgba(215,246,255,0.85)');
    centerText('and bring down the Dreadnought every fifth wave.', 514, '500 19px system-ui, sans-serif', 'rgba(215,246,255,0.85)');
    centerText('WASD / arrows — move        Mouse — aim        Click / hold — fire        SHIFT / SPACE — dash', 586, '600 16px system-ui, sans-serif', '#ffe066');
    const pulse = 0.65 + 0.35 * Math.sin(t * 3.4);
    centerText('CLICK OR PRESS ENTER TO LAUNCH', 662, '800 24px system-ui, sans-serif', '#6dffa8', pulse);
    if (best > 0) centerText(`BEST SCORE  ${best}`, 716, '700 17px system-ui, sans-serif', 'rgba(215,246,255,0.8)');
    centerText('An original game built for make.fun best-game-01', 940, '500 13px system-ui, sans-serif', 'rgba(215,246,255,0.4)');
  }

  function drawUpgrade(world, choices, mouse) {
    drawWorld(world, world.time);
    ctx.fillStyle = 'rgba(4,6,16,0.72)'; ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    centerText(`WAVE ${world.wave} CLEARED`, 268, '900 46px system-ui, sans-serif', '#6dffa8');
    centerText('Choose an upgrade — click a card or press 1 / 2 / 3', 312, '500 18px system-ui, sans-serif', 'rgba(215,246,255,0.85)');
    const cw = 360, ch = 190, gap = 36, total = cw * 3 + gap * 2;
    const x0 = (ARENA_W - total) / 2, y0 = 380;
    choices.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      const hover = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch;
      ctx.fillStyle = hover ? 'rgba(30,50,80,0.95)' : 'rgba(16,24,48,0.95)';
      ctx.strokeStyle = hover ? '#57f7ff' : 'rgba(87,247,255,0.4)';
      ctx.lineWidth = hover ? 3 : 2;
      ctx.beginPath(); ctx.roundRect(x, y0, cw, ch, 14); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066'; ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText(u.name, x + cw / 2, y0 + 66);
      ctx.fillStyle = 'rgba(215,246,255,0.9)'; ctx.font = '500 17px system-ui, sans-serif';
      ctx.fillText(u.desc, x + cw / 2, y0 + 108);
      ctx.fillStyle = 'rgba(215,246,255,0.55)'; ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y0 + 156);
    });
  }

  function drawOver(world, best, isBest) {
    drawWorld(world, world.time);
    ctx.fillStyle = 'rgba(20,4,10,0.66)'; ctx.fillRect(0, 0, ARENA_W, ARENA_H);
    centerText('BASTION FALLEN', 330, '900 64px system-ui, sans-serif', '#ff5d7a');
    centerText(`Final score  ${world.score}`, 420, '800 30px system-ui, sans-serif', '#d7f6ff');
    centerText(`Reached wave ${world.wave} · ${world.kills} kills`, 462, '500 19px system-ui, sans-serif', 'rgba(215,246,255,0.85)');
    if (isBest) centerText('NEW BEST SCORE!', 512, '800 21px system-ui, sans-serif', '#ffe066');
    else centerText(`Best score  ${best}`, 512, '600 17px system-ui, sans-serif', 'rgba(215,246,255,0.7)');
    centerText('Press R or click to fly again', 586, '700 20px system-ui, sans-serif', '#6dffa8');
  }

  function draw(state) {
    const { scale, ox, oy } = fit();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04050c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    const w = state.world;
    if (state.screen === SCREEN_TITLE) { drawTitle(w, state.t, state.best); return; }
    if (state.screen === SCREEN_UPGRADE) { drawUpgrade(w, state.choices, state.mouse); drawHUD(w, state.muted); return; }
    if (state.screen === SCREEN_OVER) { drawOver(w, state.best, state.isBest); return; }
    // Play (and paused, which overlays below): shake applies to the world only.
    if (w.shake > 0.2) ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake);
    drawWorld(w, state.t);
    drawHUD(w, state.muted);
    if (state.screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(4,6,16,0.6)'; ctx.fillRect(-20, -20, ARENA_W + 40, ARENA_H + 40);
      centerText('PAUSED', 480, '900 56px system-ui, sans-serif', '#d7f6ff');
      centerText('Press P or ESC to resume', 532, '600 18px system-ui, sans-serif', 'rgba(215,246,255,0.8)');
    }
    if (w.player.hurtCd > 0.45) {
      ctx.fillStyle = `rgba(255,40,70,${(w.player.hurtCd - 0.45) * 0.35})`;
      ctx.fillRect(-20, -20, ARENA_W + 40, ARENA_H + 40);
    }
  }

  return { draw };
}
