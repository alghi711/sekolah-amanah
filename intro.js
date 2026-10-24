(function () {
  'use strict';
  const intro = document.querySelector('#site-intro');
  if (!intro) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = window.localStorage.getItem('amanah-motion-paused') === 'true'; } catch {}
  const returning = performance.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward';
  if (reduced.matches || paused || window.location.hash || returning) return;
  const root = document.documentElement;
  const started = performance.now();
  let finished = false, readyTimer, hideTimer;
  function hide() {
    finished = true;
    window.clearTimeout(readyTimer);
    window.clearTimeout(hideTimer);
    window.clearTimeout(safetyTimer);
    intro.hidden = true;
    root.classList.remove('intro-active');
  }
  function dismiss(immediate = false) {
    if (finished) return;
    window.clearTimeout(readyTimer);
    const delay = immediate ? 0 : Math.max(0, 950 - (performance.now() - started));
    if (delay) { readyTimer = window.setTimeout(() => dismiss(true), delay); return; }
    finished = true;
    window.clearTimeout(safetyTimer);
    intro.inert = true;
    intro.classList.add('is-leaving');
    root.classList.remove('intro-active');
    hideTimer = window.setTimeout(hide, 240);
  }
  const safetyTimer = window.setTimeout(() => dismiss(true), 3000);
  document.querySelector('#intro-skip').addEventListener('click', () => dismiss(true));
  document.addEventListener('keydown', () => dismiss(true), {once: true});
  reduced.addEventListener('change', event => { if (event.matches) dismiss(true); });
  window.addEventListener('load', () => dismiss(), {once: true});
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', event => { if (event.persisted) hide(); });
  root.classList.add('intro-active');
  intro.hidden = false;
  if (document.readyState === 'complete') dismiss();
}());
