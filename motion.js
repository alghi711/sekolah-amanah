(function () {
  'use strict';
  const button = document.querySelector('#motion-toggle');
  if (!button) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = window.localStorage.getItem('amanah-motion-paused') === 'true'; } catch {}
  const idleTargets = document.querySelectorAll('.hero-background, .services-section, .cup-section, .profile-program-section, .partners-section');
  const revealTargets = document.querySelectorAll('.services-intro, .service-entry, .banner-heading, .admission-carousel, #jenjang .section-heading, .level-tile, .cup-section, #kabar .section-heading, .news-toolbar, .news-grid, .locations-heading, .location-choice, .location-map-panel, .partners-section, .profile-hero-photo, .profile-switcher, .profile-about, .profile-section-heading, .profile-program-intro, .profile-program, .profile-gallery, .profile-news-card');
  function sync() {
    const stopped = paused || reduced.matches;
    const running = !stopped && !document.hidden;
    root.classList.toggle('motion-running', running);
    button.setAttribute('aria-pressed', String(stopped));
    button.disabled = reduced.matches;
    const label = reduced.matches ? 'Animasi minimal' : paused ? 'Putar animasi' : 'Jeda animasi';
    button.querySelector('span').textContent = label;
    button.setAttribute('aria-label', `${label} halaman`);
    if (!running) revealTargets.forEach(target => target.classList.remove('is-entering'));
    document.dispatchEvent(new CustomEvent('amanah:motion', {detail: {paused: !running}}));
  }
  root.classList.add('motion-ready');
  button.hidden = false;
  button.addEventListener('click', () => {
    paused = !paused;
    try { window.localStorage.setItem('amanah-motion-paused', String(paused)); } catch {}
    sync();
  });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    try { paused = window.localStorage.getItem('amanah-motion-paused') === 'true'; } catch {}
    sync();
  });
  document.addEventListener('focusin', event => event.target.closest('.is-entering')?.classList.remove('is-entering'));
  sync();
  if (!('IntersectionObserver' in window)) return;
  const idleObserver = new window.IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('motion-inview', entry.isIntersecting));
  }, {threshold: 0});
  idleTargets.forEach(target => idleObserver.observe(target));
  const revealObserver = new window.IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (root.classList.contains('motion-running')) entry.target.classList.add('is-entering');
      revealObserver.unobserve(entry.target);
    });
  }, {threshold: .06, rootMargin: '0px 0px -20px 0px'});
  revealTargets.forEach((target, index) => {
    target.style.setProperty('--enter-delay', `${index % 3 * 65}ms`);
    target.addEventListener('animationend', event => {
      if (event.target === target && event.animationName === 'amanah-enter') target.classList.remove('is-entering');
    });
    revealObserver.observe(target);
  });
}());
