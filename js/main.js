'use strict';

const SK_SCRIPTS  = 'collectionScripts';
const SK_FOLLOWUP = 'collectionFollowup';

const CATEGORIES = [
  { name: 'PAYMENT ISSUES',      color: '#e8a838', bg: '#fef9ee' },
  { name: 'ACCOUNT STATUS',      color: '#e05555', bg: '#fef2f2' },
  { name: 'SETTLEMENT CAMPAIGN', color: '#2eaa6e', bg: '#f0fdf6' },
  { name: 'CLIENT RESPONSES',    color: '#7c5cbf', bg: '#f6f3ff' },
  { name: 'CALL / SMS',          color: '#3b82f6', bg: '#eff6ff' },
  { name: 'TOOLS',               color: '#64748b', bg: '#f8fafc' },
  { name: 'UNCATEGORIZED',       color: '#94a3b8', bg: '#f8fafc' },
];

function catCfg(name) {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}

let scripts        = [];
let followups      = [];
let activeScriptId = null;
let activeTab      = 'IL';
let dragSrcId      = null;
let activeFollowupId = null;

function loadAll() {
  try { scripts   = JSON.parse(localStorage.getItem(SK_SCRIPTS)  || '[]'); } catch { scripts   = []; }
  try { followups = JSON.parse(localStorage.getItem(SK_FOLLOWUP) || '[]'); } catch { followups = []; }

  scripts.forEach(s => {
    if (!s.category)  s.category  = 'UNCATEGORIZED';
    if (!s.createdAt) s.createdAt = Date.now();
    if (s.favorite === undefined) s.favorite = false;

    if (s.content !== undefined && s.infinityLoans === undefined) {
      s.infinityLoans   = s.content;
      s.infinityFinance = s.contentFr || '';
      delete s.content;
      delete s.contentFr;
    }
    if (s.english !== undefined && s.infinityLoans === undefined) {
      s.infinityLoans   = s.english;
      s.infinityFinance = s.french || '';
      delete s.english;
      delete s.french;
    }
    if (s.infinityLoans   === undefined) s.infinityLoans   = '';
    if (s.infinityFinance === undefined) s.infinityFinance = '';
  });
}

function saveScripts()  { localStorage.setItem(SK_SCRIPTS,  JSON.stringify(scripts));   }
function saveFollowups(){ localStorage.setItem(SK_FOLLOWUP, JSON.stringify(followups)); }

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  const navEl  = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');
  if (page === 'scripts')  renderScriptGrid();
  if (page === 'followup') renderFollowup();
  closeMobileSidebar();
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

const sidebar = document.getElementById('sidebar');
const scrim   = document.getElementById('sidebarScrim');

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  sidebar.classList.add('open');
  scrim.classList.add('active');
});

scrim.addEventListener('click', closeMobileSidebar);

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  scrim.classList.remove('active');
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function openOverlay(id)  { document.getElementById(id).classList.add('active'); }
function closeOverlay(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => closeOverlay(el.dataset.close));
});

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(ov.id); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.overlay.active').forEach(o => closeOverlay(o.id));
});

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', () => {
  searchClear.style.display = searchInput.value ? 'flex' : 'none';
  renderScriptGrid();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  renderScriptGrid();
});

document.getElementById('addScriptBtn').addEventListener('click', () => openEditModal(null));

function renderScriptGrid() {
  const grid  = document.getElementById('scriptGrid');
  const query = searchInput.value.trim().toLowerCase();
  grid.innerHTML = '';

  if (!scripts.length && !query) {
    grid.innerHTML = `
      <div class="scripts-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p class="empty-title">No scripts yet</p>
        <p class="empty-sub">Click <strong>Add Script</strong> to create your first template.</p>
      </div>`;
    renderCategoryNav();
    return;
  }

  if (query) {
    renderSearchResults(grid, query);
    return;
  }

  renderFavoritesSection(grid);
  renderCategoryGroups(grid);
  renderCategoryNav();
}

function renderFavoritesSection(grid) {
  const favs = scripts.filter(s => s.favorite);
  if (!favs.length) return;

  const section = document.createElement('div');
  section.className = 'category-section';
  section.innerHTML = `
    <div class="cat-header">
      <span class="cat-stripe" style="background:#f59e0b"></span>
      <span class="cat-label">⭐ Favorites</span>
      <span class="cat-line"></span>
      <span class="cat-count">${favs.length}</span>
    </div>`;

  const g = document.createElement('div');
  g.className = 'script-grid';
  favs.forEach(s => g.appendChild(buildCard(s, false)));
  section.appendChild(g);
  grid.appendChild(section);
}

function renderCategoryGroups(grid) {
  const groups = {};
  CATEGORIES.forEach(c => { groups[c.name] = []; });
  scripts.forEach(s => {
    const cat = s.category || 'UNCATEGORIZED';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });
  CATEGORIES.forEach(c => {
    groups[c.name].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return (a.catOrder || 0) - (b.catOrder || 0);
    });
  });

  CATEGORIES.forEach(cat => {
    const list = groups[cat.name];
    if (!list.length) return;
    const cfg = catCfg(cat.name);
    const section = document.createElement('div');
    section.className = 'category-section';
    section.dataset.category = cat.name;
    section.innerHTML = `
      <div class="cat-header">
        <span class="cat-stripe" style="background:${cfg.color}"></span>
        <span class="cat-label">${cat.name}</span>
        <span class="cat-line"></span>
        <span class="cat-count">${list.length}</span>
      </div>`;
    const g = document.createElement('div');
    g.className = 'script-grid';
    g.dataset.category = cat.name;
    list.forEach(s => g.appendChild(buildCard(s, false)));
    section.appendChild(g);
    grid.appendChild(section);
  });
}

function renderSearchResults(grid, query) {
  const filtered = scripts.filter(s =>
    s.title.toLowerCase().includes(query) ||
    (s.infinityLoans   || '').toLowerCase().includes(query) ||
    (s.infinityFinance || '').toLowerCase().includes(query)
  );

  if (!filtered.length) {
    grid.innerHTML = `<div class="search-no-results">No scripts match "<strong>${esc(query)}</strong>"</div>`;
    return;
  }

  const g = document.createElement('div');
  g.className = 'script-grid';
  filtered.forEach(s => g.appendChild(buildCard(s, true)));
  grid.appendChild(g);
}

function buildCard(script, showCatBadge) {
  const cfg  = catCfg(script.category);
  const card = document.createElement('div');
  card.className = `script-card${script.favorite ? ' is-favorite' : ''}`;
  card.dataset.id = script.id;
  card.draggable  = true;
  card.style.borderTopColor = cfg.color;

  const preview = (script.infinityLoans || '').split('\n').find(l => l.trim()) || '';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-title">${esc(script.title)}</span>
      <span class="card-drag-handle" title="Drag to reorder">
        <svg width="9" height="13" viewBox="0 0 9 13" fill="currentColor">
          <circle cx="2" cy="1.5" r="1.5"/><circle cx="7" cy="1.5" r="1.5"/>
          <circle cx="2" cy="6.5" r="1.5"/><circle cx="7" cy="6.5" r="1.5"/>
          <circle cx="2" cy="11.5" r="1.5"/><circle cx="7" cy="11.5" r="1.5"/>
        </svg>
      </span>
    </div>
    ${preview ? `<p class="card-preview">${esc(preview)}</p>` : ''}
    <span class="card-cat-badge${showCatBadge ? ' always-show' : ''}"
          style="background:${cfg.bg};color:${cfg.color}">
      <span class="card-cat-dot" style="background:${cfg.color}"></span>
      ${script.category}
    </span>
    <div class="card-actions">
      <button class="card-action-btn copy-title-btn" title="Copy title">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Title
      </button>
      <button class="card-action-btn fav-btn${script.favorite ? ' active' : ''}" title="${script.favorite ? 'Unfavorite' : 'Favorite'}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="${script.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <span class="card-action-spacer"></span>
      <button class="card-action-btn edit-card-btn" title="Edit script">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
    </div>`;

  card.addEventListener('click', e => {
    if (e.target.closest('.card-actions')) return;
    openViewModal(script.id);
  });

  card.querySelector('.copy-title-btn').addEventListener('click', e => {
    e.stopPropagation();
    copyText(script.title);
    showToast('Title copied', 'success');
  });

  card.querySelector('.fav-btn').addEventListener('click', e => {
    e.stopPropagation();
    const s = scripts.find(x => x.id === script.id);
    if (s) {
      s.favorite = !s.favorite;
      saveScripts();
      renderScriptGrid();
      showToast(s.favorite ? '⭐ Added to favorites' : 'Removed from favorites', 'info');
    }
  });

  card.querySelector('.edit-card-btn').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(script.id);
  });

  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragover',  handleDragOver);
  card.addEventListener('drop',      handleDrop);
  card.addEventListener('dragend',   handleDragEnd);
  card.addEventListener('dragleave', e => e.currentTarget.classList.remove('drag-over'));

  return card;
}

function renderCategoryNav() {
  const nav   = document.getElementById('categoryNav');
  const label = document.getElementById('catNavLabel');
  nav.innerHTML = '';
  const usedCats = CATEGORIES.filter(c => scripts.some(s => s.category === c.name));
  if (!usedCats.length) { label.style.display = 'none'; return; }
  label.style.display = 'block';
  usedCats.forEach(cat => {
    const count = scripts.filter(s => s.category === cat.name).length;
    const cfg   = catCfg(cat.name);
    const li    = document.createElement('li');
    li.innerHTML = `
      <button class="nav-item">
        <span class="nav-cat-dot" style="background:${cfg.color}"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat.name}</span>
        <span class="nav-cat-count">${count}</span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => {
      navigateTo('scripts');
      setTimeout(() => {
        const sec = document.querySelector(`.category-section[data-category="${cat.name}"]`);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
    nav.appendChild(li);
  });
}

function openViewModal(id) {
  const s = scripts.find(x => x.id === id);
  if (!s) return;
  activeScriptId = id;
  activeTab      = 'IL';
  const cfg = catCfg(s.category);
  document.getElementById('viewTitle').textContent = s.title;
  const badge = document.getElementById('viewCategoryBadge');
  badge.textContent      = s.category;
  badge.style.background = cfg.bg;
  badge.style.color      = cfg.color;
  renderViewContent();
  openOverlay('viewOverlay');
}

function renderViewContent() {
  const s = scripts.find(x => x.id === activeScriptId);
  if (!s) return;
  document.getElementById('viewTabIL').classList.toggle('active', activeTab === 'IL');
  document.getElementById('viewTabIF').classList.toggle('active', activeTab === 'IF');
  const vc = document.getElementById('viewContent');
  if (activeTab === 'IL') {
    vc.textContent = s.infinityLoans || '';
    vc.classList.remove('lang-empty');
  } else {
    const ifText = (s.infinityFinance || '').trim();
    vc.textContent = ifText || 'No Infinity Finance version yet. Click Edit to add one.';
    vc.classList.toggle('lang-empty', !ifText);
  }
}

document.getElementById('viewTabIL').addEventListener('click', () => { activeTab = 'IL'; renderViewContent(); });
document.getElementById('viewTabIF').addEventListener('click', () => { activeTab = 'IF'; renderViewContent(); });

document.getElementById('copyFullBtn').addEventListener('click', () => {
  const s = scripts.find(x => x.id === activeScriptId);
  if (!s) return;
  const text = activeTab === 'IF' ? (s.infinityFinance || '').trim() : s.infinityLoans || '';
  if (!text && activeTab === 'IF') { showToast('No Infinity Finance version to copy', 'warn'); return; }
  copyText(text);
  showToast('Script copied', 'success');
});

document.getElementById('editBtn').addEventListener('click', () => {
  const s = scripts.find(x => x.id === activeScriptId);
  if (!s) return;
  closeOverlay('viewOverlay');
  openEditModal(s.id);
});

document.getElementById('deleteBtn').addEventListener('click', () => openOverlay('confirmOverlay'));

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  if (activeScriptId) {
    scripts = scripts.filter(s => s.id !== activeScriptId);
    saveScripts();
    renderScriptGrid();
    showToast('Script deleted', 'info');
  }
  closeOverlay('confirmOverlay');
  closeOverlay('viewOverlay');
  activeScriptId = null;
});

function populateCategorySelect(selected) {
  const sel = document.getElementById('editCategorySelect');
  sel.innerHTML = CATEGORIES.map(c =>
    `<option value="${c.name}"${c.name === selected ? ' selected' : ''}>${c.name}</option>`
  ).join('');
}

function openEditModal(id) {
  const s = id ? scripts.find(x => x.id === id) : null;
  activeScriptId = id || null;
  document.getElementById('editModalTitle').textContent = s ? 'Edit Script' : 'Add Script';
  document.getElementById('editTitleInput').value       = s ? s.title            : '';
  document.getElementById('editContentIL').value        = s ? (s.infinityLoans   || '') : '';
  document.getElementById('editContentIF').value        = s ? (s.infinityFinance || '') : '';
  populateCategorySelect(s ? s.category : 'UNCATEGORIZED');
  openOverlay('editOverlay');
  setTimeout(() => document.getElementById('editTitleInput').focus(), 60);
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const title          = document.getElementById('editTitleInput').value.trim();
  const category       = document.getElementById('editCategorySelect').value;
  const infinityLoans  = document.getElementById('editContentIL').value.trim();
  const infinityFinance= document.getElementById('editContentIF').value.trim();

  if (!title) { document.getElementById('editTitleInput').focus(); return; }

  if (activeScriptId) {
    const s = scripts.find(x => x.id === activeScriptId);
    if (s) Object.assign(s, { title, category, infinityLoans, infinityFinance });
    showToast('Script updated', 'success');
  } else {
    scripts.push({
      id:             'sc-' + Date.now() + '-' + Math.floor(Math.random() * 9999),
      title, category, infinityLoans, infinityFinance,
      favorite:       false,
      catOrder:       scripts.filter(s => s.category === category).length,
      createdAt:      Date.now(),
    });
    showToast('Script saved', 'success');
  }

  saveScripts();
  closeOverlay('editOverlay');
  activeScriptId = null;
  renderScriptGrid();
});

function handleDragStart(e) {
  dragSrcId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (e.currentTarget.dataset.id !== dragSrcId)
    e.currentTarget.classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  const src = scripts.find(s => s.id === dragSrcId);
  const dst = scripts.find(s => s.id === target.dataset.id);
  if (!src || !dst || src.id === dst.id) return;
  if (src.category !== dst.category) { showToast('Drag within the same category to reorder', 'warn'); return; }
  const si = scripts.indexOf(src), di = scripts.indexOf(dst);
  scripts.splice(si, 1);
  scripts.splice(di, 0, src);
  let ord = 0;
  scripts.forEach(s => { if (s.category === src.category) s.catOrder = ord++; });
  saveScripts();
  renderScriptGrid();
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.script-card.drag-over').forEach(c => c.classList.remove('drag-over'));
  dragSrcId = null;
}

document.getElementById('addFollowupBtn').addEventListener('click', () => openFollowupModal(null));
document.getElementById('followupSearch').addEventListener('input', renderFollowup);

function renderFollowup() {
  const query  = document.getElementById('followupSearch').value.toLowerCase();
  const tbody  = document.getElementById('followupBody');
  const empty  = document.getElementById('followupEmpty');
  const badge  = document.getElementById('followupBadge');

  const activeCount = followups.filter(f => f.status !== 'Settled' && f.status !== 'Closed').length;
  badge.textContent   = activeCount;
  badge.style.display = activeCount > 0 ? 'inline-block' : 'none';

  const list = followups.filter(f =>
    !query ||
    (f.name       || '').toLowerCase().includes(query) ||
    (f.contact    || '').toLowerCase().includes(query) ||
    (f.notes      || '').toLowerCase().includes(query) ||
    (f.nextAction || '').toLowerCase().includes(query)
  );

  tbody.innerHTML = '';
  empty.style.display = list.length ? 'none' : 'flex';

  list.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(f.name || '—')}</strong></td>
      <td class="truncate">${esc(f.contact || '—')}</td>
      <td><span class="status-pill" data-status="${esc(f.status || 'Pending')}">${esc(f.status || 'Pending')}</span></td>
      <td class="truncate">${esc(f.nextAction || '—')}</td>
      <td class="truncate">${esc(f.notes || '—')}</td>
      <td style="white-space:nowrap;font-size:12.5px;color:var(--muted)">${esc(f.date || '—')}</td>
      <td style="white-space:nowrap;text-align:right">
        <button class="tbl-action-btn" data-action="edit" data-id="${f.id}" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="tbl-action-btn danger" data-action="delete" data-id="${f.id}" title="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openFollowupModal(btn.dataset.id); });
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      activeFollowupId = btn.dataset.id;
      openOverlay('confirmFollowupOverlay');
    });
  });
}

function openFollowupModal(id) {
  const f = id ? followups.find(x => x.id === id) : null;
  activeFollowupId = id || null;
  document.getElementById('followupModalTitle').textContent = f ? 'Edit Client' : 'Add Client';
  document.getElementById('fuName').value       = f ? (f.name       || '') : '';
  document.getElementById('fuContact').value    = f ? (f.contact    || '') : '';
  document.getElementById('fuStatus').value     = f ? (f.status     || 'Pending') : 'Pending';
  document.getElementById('fuDate').value       = f ? (f.date       || '') : todayStr();
  document.getElementById('fuNextAction').value = f ? (f.nextAction || '') : '';
  document.getElementById('fuNotes').value      = f ? (f.notes      || '') : '';
  openOverlay('followupOverlay');
  setTimeout(() => document.getElementById('fuName').focus(), 60);
}

document.getElementById('saveFollowupBtn').addEventListener('click', () => {
  const name       = document.getElementById('fuName').value.trim();
  const contact    = document.getElementById('fuContact').value.trim();
  const status     = document.getElementById('fuStatus').value;
  const date       = document.getElementById('fuDate').value;
  const nextAction = document.getElementById('fuNextAction').value.trim();
  const notes      = document.getElementById('fuNotes').value.trim();
  if (!name) { document.getElementById('fuName').focus(); return; }
  if (activeFollowupId) {
    const f = followups.find(x => x.id === activeFollowupId);
    if (f) Object.assign(f, { name, contact, status, date, nextAction, notes });
  } else {
    followups.push({
      id: 'fu-' + Date.now() + '-' + Math.floor(Math.random() * 9999),
      name, contact, status, date, nextAction, notes,
    });
  }
  saveFollowups();
  closeOverlay('followupOverlay');
  activeFollowupId = null;
  renderFollowup();
  showToast('Saved', 'success');
});

document.getElementById('confirmDeleteFollowupBtn').addEventListener('click', () => {
  if (activeFollowupId) {
    followups = followups.filter(f => f.id !== activeFollowupId);
    saveFollowups();
    renderFollowup();
    showToast('Client removed', 'info');
  }
  closeOverlay('confirmFollowupOverlay');
  activeFollowupId = null;
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    version:    3,
    exportedAt: new Date().toISOString(),
    scripts,
    followups,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vien-workspace-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported', 'success');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.scripts) {
        scripts = data.scripts.map(s => {
          if (s.content !== undefined && s.infinityLoans === undefined) {
            s.infinityLoans   = s.content;
            s.infinityFinance = s.contentFr || '';
            delete s.content;
            delete s.contentFr;
          }
          if (s.english !== undefined && s.infinityLoans === undefined) {
            s.infinityLoans   = s.english;
            s.infinityFinance = s.french || '';
            delete s.english;
            delete s.french;
          }
          if (!s.infinityLoans)   s.infinityLoans   = '';
          if (!s.infinityFinance) s.infinityFinance = '';
          if (!s.category)  s.category  = 'UNCATEGORIZED';
          if (s.favorite === undefined) s.favorite = false;
          return s;
        });
        saveScripts();
      }
      if (data.followups) { followups = data.followups; saveFollowups(); }
      renderScriptGrid();
      renderCategoryNav();
      showToast('Backup imported successfully', 'success');
    } catch {
      showToast('Import failed — invalid file', 'warn');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('clearDataBtn').addEventListener('click', () => openOverlay('confirmClearOverlay'));

document.getElementById('clearStep1Btn').addEventListener('click', () => {
  closeOverlay('confirmClearOverlay');
  openOverlay('confirmClearFinalOverlay');
});

document.getElementById('clearGoBackBtn').addEventListener('click', () => {
  closeOverlay('confirmClearFinalOverlay');
  openOverlay('confirmClearOverlay');
});

document.getElementById('confirmClearBtn').addEventListener('click', () => {
  scripts   = [];
  followups = [];
  saveScripts();
  saveFollowups();
  closeOverlay('confirmClearFinalOverlay');
  renderScriptGrid();
  renderCategoryNav();
  showToast('Workspace cleared', 'info');
});

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => copyFallback(text));
  } else {
    copyFallback(text);
  }
}

function copyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

loadAll();
navigateTo('scripts');
renderCategoryNav();