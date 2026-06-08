/* TenderMap shared UI helpers */

async function loadCategoryFilter(selectId) {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (!data.success || !data.data) return;
    const sel = document.getElementById(selectId);
    if (!sel) return;
    while (sel.options.length > 1) sel.remove(1);
    const sorted = data.data.slice().sort((a, b) => b.count - a.count);
    for (const cat of sorted) {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.name} (${cat.count})`;
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
