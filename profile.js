(function () {
  'use strict';
  const button = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  function close() {
    navigation.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      close();
      button.focus();
    }
  });
}());
