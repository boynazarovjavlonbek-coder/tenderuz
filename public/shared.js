/* TenderMap shared UI helpers */

function toggleNav() {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('hamburger');
  const isOpen = nav.classList.toggle('open');
  btn.classList.toggle('open', isOpen);

  // overlay
  let overlay = document.getElementById('navOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'navOverlay';
    overlay.className = 'nav-overlay';
    overlay.onclick = closeNav;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('show', isOpen);
}

function closeNav() {
  document.getElementById('mainNav')?.classList.remove('open');
  document.getElementById('hamburger')?.classList.remove('open');
  document.getElementById('navOverlay')?.classList.remove('show');
}

// nav linkni bosganida yopish
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav .nav-link').forEach(l =>
    l.addEventListener('click', closeNav)
  );
});
