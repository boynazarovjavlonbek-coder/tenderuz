/* TenderMap shared UI helpers */

async function loadCategoryFilter(selectId) {
  try {
    const res = await fetch('/api/counts');
    const data = await res.json();
    const cats = data.categories || {};
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const sel = document.getElementById(selectId);
    if (!sel) return;
    // Keep first option ("Barcha kategoriyalar"), remove the rest
    while (sel.options.length > 1) sel.remove(1);
    for (const [name, count] of sorted) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${count})`;
      sel.appendChild(opt);
    }
  } catch(e) { console.error('Category filter load error:', e); }
}

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
