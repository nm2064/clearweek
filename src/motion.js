export function setupMotion() {
  const page = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const firstAnimations = [];

  document.addEventListener('keydown', () => {
    page.dataset.input = 'keyboard';
    firstAnimations.forEach(animation => animation.cancel());
  }, true);
  document.addEventListener('pointerdown', () => { page.dataset.input = 'pointer'; }, true);

  if (!reduced.matches && typeof Element.prototype.animate === 'function') {
    document.querySelectorAll('.day').forEach((day, index) => {
      firstAnimations.push(day.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 250, delay: index * 30, fill: 'backwards', easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      ));
    });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) firstAnimations.forEach(animation => animation.cancel());
  });
}
