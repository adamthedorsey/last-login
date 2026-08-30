/**
 * The Win95 minimize/restore animation: a dotted wireframe rectangle stepping
 * between the window and its taskbar button. Constant velocity, fixed frame
 * count, no easing — it's a flipbook, not a tween.
 */
export interface ZoomBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const STEPS = 7;
const FRAME_MS = 26;

export function animateZoom(from: ZoomBox, to: ZoomBox): void {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;border:2px dotted #e8e8e8;pointer-events:none;z-index:100010;mix-blend-mode:difference;';
  document.body.appendChild(el);
  let i = 0;
  const draw = () => {
    const t = i / (STEPS - 1);
    el.style.left = `${Math.round(from.x + (to.x - from.x) * t)}px`;
    el.style.top = `${Math.round(from.y + (to.y - from.y) * t)}px`;
    el.style.width = `${Math.round(from.w + (to.w - from.w) * t)}px`;
    el.style.height = `${Math.round(from.h + (to.h - from.h) * t)}px`;
  };
  draw();
  const timer = window.setInterval(() => {
    i += 1;
    if (i >= STEPS) {
      window.clearInterval(timer);
      el.remove();
      return;
    }
    draw();
  }, FRAME_MS);
}

/** The taskbar button a window minimizes into (falls back to bottom-left). */
export function taskbarButtonBox(windowId: string): ZoomBox {
  const btn = document.querySelector(`[data-taskbar-btn="${windowId}"]`);
  if (btn) {
    const r = btn.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return { x: 70, y: window.innerHeight - 34, w: 150, h: 26 };
}
