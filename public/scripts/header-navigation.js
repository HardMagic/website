const items = [...document.querySelectorAll('.mega-item')];

items.forEach((item) => item.addEventListener('toggle', () => {
  if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
}));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') items.forEach((item) => { item.open = false; });
});

document.addEventListener('pointerdown', (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.mega-item')) items.forEach((item) => { item.open = false; });
});
