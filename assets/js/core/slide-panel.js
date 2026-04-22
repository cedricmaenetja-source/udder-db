function initSlidePanel(openBtnSelector, panelClass, overlayClass) {
  const panel = document.querySelector(panelClass);
  const overlay = document.querySelector(overlayClass);
  const btns = document.querySelectorAll(openBtnSelector);

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      panel.classList.add('active');
      overlay.style.display = 'block';
    });
  });

  overlay.addEventListener('click', () => {
    panel.classList.remove('active');
    overlay.style.display = 'none';
  });
}