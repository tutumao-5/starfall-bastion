// Keyboard and mouse state. Movement keys, dash, pause and the one-shot action
// keys (confirm / upgrade picks) are exposed as plain fields the loop reads.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, cx: 0, cy: 0 };

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(r.width / 1600, r.height / 1000);
    const ox = (r.width - 1600 * scale) / 2;
    const oy = (r.height - 1000 * scale) / 2;
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e); mouse.x = p.x; mouse.y = p.y;
    mouse.down = true; mouse.clicked = true; mouse.cx = p.x; mouse.cy = p.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; const p = toGame(t); mouse.x = p.x; mouse.y = p.y; mouse.down = true; mouse.clicked = true; mouse.cx = p.x; mouse.cy = p.y;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { const t = e.touches[0]; const p = toGame(t); mouse.x = p.x; mouse.y = p.y; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', () => { mouse.down = false; });

  return {
    mouse,
    down: (code) => keys.has(code),
    /** Consume one-shot presses made since the last frame. */
    takePressed() { const out = new Set(pressed); pressed.clear(); return out; },
    endFrame() { mouse.clicked = false; },
    moveAxis() {
      let x = 0, y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { const inv = Math.SQRT1_2; x *= inv; y *= inv; }
      return { x, y };
    },
  };
}
