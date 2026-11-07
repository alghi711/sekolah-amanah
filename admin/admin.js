'use strict';
const passwordToggle = document.querySelector('[data-password-toggle]');
if (passwordToggle) {
  passwordToggle.hidden = false;
  passwordToggle.addEventListener('click', () => {
    const password = document.querySelector('#password');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    passwordToggle.textContent = visible ? 'Sembunyikan' : 'Tampilkan';
    passwordToggle.setAttribute('aria-pressed', String(visible));
  });
}
const photo = document.querySelector('#photo');
if (photo) {
  const preview = document.querySelector('#photo-preview');
  const image = document.querySelector('#preview-image');
  const status = document.querySelector('#photo-status');
  let source;
  function resetPreview() {
    if (source) URL.revokeObjectURL(source);
    source = undefined;
    image.removeAttribute('src');
    preview.hidden = true;
    status.textContent = '';
  }
  photo.addEventListener('change', () => {
    resetPreview();
    const file = photo.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      status.textContent = 'Pilih foto JPEG, PNG, atau WebP maksimal 8 MB.';
      photo.value = '';
      return;
    }
    source = URL.createObjectURL(file);
    image.src = source;
    preview.hidden = false;
    status.textContent = 'Foto dipilih: ' + file.name;
  });
  document.querySelector('#remove-photo').addEventListener('click', () => {
    photo.value = '';
    resetPreview();
    photo.focus();
  });
}
document.querySelector('#publish-form')?.addEventListener('submit', () => {
  const button = document.querySelector('#publish-button');
  button.disabled = true;
  button.textContent = document.querySelector('[name=action][value=update]') ? 'Menyimpan…' : 'Menerbitkan…';
});
