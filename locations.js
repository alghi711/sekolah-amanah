(function () {
  'use strict';
  const map = document.querySelector('#school-map');
  if (!map) return;
  const choices = document.querySelectorAll('.location-choice');
  const name = document.querySelector('#location-map-name');
  const address = document.querySelector('#location-map-address');
  const directions = document.querySelector('#location-directions');
  const status = document.querySelector('#location-status');
  choices.forEach(choice => choice.addEventListener('click', () => {
    if (choice.getAttribute('aria-pressed') === 'true') return;
    choices.forEach(item => {
      const selected = item === choice;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    const school = choice.querySelector('.location-choice-name').textContent;
    name.textContent = school;
    address.textContent = choice.dataset.address;
    directions.href = choice.dataset.directions;
    map.title = `Peta lokasi ${school}`;
    map.src = choice.dataset.mapSrc;
    status.textContent = `Lokasi dipilih: ${school}. Peta dan alamat telah diperbarui.`;
  }));
}());
