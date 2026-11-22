// Tiny frame-rate meter, shown when the link has ?fps on the end.
// Plain HTML (not a game Text object) so measuring doesn't slow the game down.
export function startFpsMeter() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 6px);transform:translateX(-50%);'
    + 'z-index:50;padding:4px 10px;border-radius:10px;background:rgba(0,0,0,0.6);color:#fff;'
    + 'font:bold 14px ui-monospace,Menlo,monospace;pointer-events:none;white-space:nowrap';
  document.body.appendChild(el);

  let frames = 0;
  let worst = 0;
  let last = performance.now();
  let windowStart = last;
  const tick = (now) => {
    frames += 1;
    worst = Math.max(worst, now - last);
    last = now;
    if (now - windowStart >= 1000) {
      const fps = Math.round((frames * 1000) / (now - windowStart));
      el.textContent = `${fps} fps · worst ${Math.round(worst)} ms`;
      el.style.color = fps >= 55 ? '#7CFC9A' : fps >= 40 ? '#ffd166' : '#ff6b6b';
      frames = 0;
      worst = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
