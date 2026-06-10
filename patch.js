const fs = require('fs');

// === shared.css ===
let css = fs.readFileSync('public/shared.css', 'utf8');

css = css.replace(
  '.modal-footer { padding: 16px 24px 24px; border-top: 1px solid var(--border); }',
  '.modal-footer { padding: 16px 24px 24px; border-top: 1px solid var(--border); display:flex; gap:10px; flex-wrap:wrap; }'
);

const newCSS = `
.btn-modal-save{padding:13px 16px;background:#f5f5f5;color:#333;border:none;border-radius:var(--r-sm);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;}
.btn-modal-save.saved{background:#fff3e0;color:#e65100;}
.btn-modal-copy{padding:13px 14px;background:#f5f5f5;color:#555;border:none;border-radius:var(--r-sm);font-size:16px;cursor:pointer;}
.refresh-status{display:flex;align-items:center;gap:8px;}
.live-dot{width:9px;height:9px;border-radius:50%;background:#4caf50;flex-shrink:0;position:relative;}
.live-dot::before{content:'';position:absolute;inset:-4px;border-radius:50%;background:rgba(76,175,80,.3);animation:livePulse 1.8s ease-in-out infinite;}
@keyframes livePulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.6);opacity:0}}
`;

if (!css.includes('btn-modal-save')) {
  css = css.replace(
    '.btn-modal-link:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 7px 22px rgba(26,35,126,.42); }',
    '.btn-modal-link:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 7px 22px rgba(26,35,126,.42); }' + newCSS
  );
}
fs.writeFileSync('public/shared.css', css);
console.log('shared.css - OK');

// === HELPERS ===
const helpers = `
function getSavedIds(){try{return JSON.parse(localStorage.getItem('tm_saved')||'[]')}catch{return[]}}
function toggleSave(id,btn){let s=getSavedIds();if(s.includes(String(id))){s=s.filter(x=>x!==String(id));btn.innerHTML='\u{1F90D} Saqlash';btn.classList.remove('saved')}else{s.push(String(id));btn.innerHTML='\u{2764}\u{FE0F} Saqlangan';btn.classList.add('saved')}localStorage.setItem('tm_saved',JSON.stringify(s));showToast(s.includes(String(id))?'Saqlandi \u{2764}\u{FE0F}':"O'chirildi")}
function copyLink(url){navigator.clipboard&&navigator.clipboard.writeText(url).then(function(){showToast('Nusxalandi \u{1F4CB}')})}
function showToast(msg){var el=document.getElementById('tmToast');if(!el){el=document.createElement('div');el.id='tmToast';el.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#1a237e;color:#fff;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;transition:transform .3s;pointer-events:none;white-space:nowrap';document.body.appendChild(el)}el.textContent=msg;el.style.transform='translateX(-50%) translateY(0)';clearTimeout(el._t);el._t=setTimeout(function(){el.style.transform='translateX(-50%) translateY(80px)'},2500)}
`;

// === index.html ===
let idx = fs.readFileSync('public/index.html', 'utf8');

// 1. Refresh text
idx = idx.replace(
  "rem > 0 ? `Keyingi: ${h}s ${m}d` : ''",
  "rem > 0 ? (h > 0 ? `${h} soat ${m} daqiqadan keyin yangilanadi` : `${m} daqiqadan keyin yangilanadi`) : ''"
);

// 2. Modal footer
idx = idx.replace(
  "Asl saytda ko'rish \u2192",
  "\u{1F517} Manba saytda ko'rish"
);

// 3. Add save/copy buttons after modal link (only if not already added)
if (!idx.includes('btn-modal-copy')) {
  idx = idx.replace(
    `      </a>\n    </div>\`;\n}\n\n/* \u2500\u2500 save`,
    `      </a>\n      <button class="btn-modal-save" onclick="toggleSave('\${esc(t.id)}',this)">\u{1F90D} Saqlash</button>\n      <button class="btn-modal-copy" onclick="copyLink('\${esc(t.url)}')">\u{1F4CB}</button>\n    </div>\`;\n}\n\n/* \u2500\u2500 save`
  );
}

// 4. Add helpers before refresh section
if (!idx.includes('getSavedIds')) {
  idx = idx.replace('/* \u2500\u2500 refresh \u2500\u2500 */', helpers + '\n/* \u2500\u2500 refresh \u2500\u2500 */');
}

fs.writeFileSync('public/index.html', idx);
console.log('index.html - OK');

// === tenders.html ===
let ten = fs.readFileSync('public/tenders.html', 'utf8');

ten = ten.replace(
  "Asl saytda ko'rish \u2192",
  "\u{1F517} Manba saytda ko'rish"
);

if (!ten.includes('btn-modal-copy')) {
  ten = ten.replace(
    `      </a>\n  document.getElementById`,
    `      </a>\n      <button class="btn-modal-save" onclick="toggleSave('\${esc(t.id)}',this)">\u{1F90D} Saqlash</button>\n      <button class="btn-modal-copy" onclick="copyLink('\${esc(t.url)}')">\u{1F4CB}</button>\n    </div>\`;\n  document.getElementById`
  );
}

if (!ten.includes('getSavedIds')) {
  ten = ten.replace(
    "document.getElementById('searchInput').addEventListener",
    helpers + "\ndocument.getElementById('searchInput').addEventListener"
  );
}

fs.writeFileSync('public/tenders.html', ten);
console.log('tenders.html - OK');

console.log('\nHAMMA NARSA TAYYOR! Endi: git add -A && git commit -m "feat: UX improvements" && git push origin main');
