/** Student dashboard: counts, ticket list, filing form and ticket drawer. */

import {
  api,
  mountChrome,
  loadSession,
  escapeHtml,
  formatDate,
  statusPill,
  priorityBadge,
  categoryLabel,
  timelineHtml,
  toast,
  copyText,
  CATEGORY_LABELS,
  ICON,
} from './app.js';

mountChrome('dashboard');

const el = {
  loading: document.getElementById('loading-note'),
  dash: document.getElementById('dash'),
  greeting: document.getElementById('dash-greeting'),
  sub: document.getElementById('dash-sub'),
  list: document.getElementById('grievance-list'),
  tabButtons: Array.from(document.querySelectorAll('.panel-tab')),
  viewMine: document.getElementById('view-mine'),
  viewFile: document.getElementById('view-file'),
  panelTitle: document.getElementById('panel-title'),
  panelSub: document.getElementById('panel-sub'),
  form: document.getElementById('grievance-form'),
  formError: document.getElementById('form-error'),
  success: document.getElementById('file-success'),
  category: document.getElementById('grievance-category'),
  submit: document.getElementById('grievance-submit'),
  modal: document.getElementById('detail-modal'),
  drawer: document.getElementById('detail-drawer'),
};

const state = { user: null, grievances: [] };

/* ------------------------------------------------------------------ UI --- */

function buildCategoryOptions() {
  el.category.insertAdjacentHTML(
    'beforeend',
    Object.entries(CATEGORY_LABELS)
      .map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`)
      .join('')
  );
}

function setTab(name) {
  const isFile = name === 'file';

  el.tabButtons.forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === name));
  });

  el.viewMine.hidden = isFile;
  el.viewFile.hidden = !isFile;

  el.panelTitle.textContent = isFile ? 'File a grievance' : 'My grievances';
  el.panelSub.textContent = isFile
    ? 'Be specific about what happened, where, and who you already spoke to.'
    : 'Newest first. Select a ticket to read the full timeline.';

  if (isFile) el.category.focus();
}

el.tabButtons.forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));

document.querySelectorAll('[data-open-file]').forEach((button) =>
  button.addEventListener('click', () => {
    setTab('file');
    document.getElementById('grievance-category').focus();
  })
);

function showFormError(message) {
  el.formError.innerHTML = message
    ? `<div class="alert alert--error" role="alert">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
         <span>${escapeHtml(message)}</span>
       </div>`
    : '';
}

function setBusy(busy) {
  el.submit.disabled = busy;
  el.submit.textContent = busy ? 'Submitting…' : 'Submit grievance';
}

/* --------------------------------------------------------------- Render --- */

function renderKpis() {
  const counts = { total: state.grievances.length, pending: 0, review: 0, resolved: 0 };
  for (const grievance of state.grievances) {
    if (grievance.status in counts) counts[grievance.status] += 1;
  }

  for (const [key, value] of Object.entries(counts)) {
    const node = document.querySelector(`[data-kpi="${key}"]`);
    if (node) node.textContent = String(value);
  }
}

function renderList() {
  if (!state.grievances.length) {
    el.list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h6M10 16h6" /></svg>
        <h3>No grievances yet</h3>
        <p>When you file your first grievance it will appear here with a tracking ID.</p>
      </div>
    `;
    return;
  }

  el.list.innerHTML = state.grievances
    .map(
      (grievance) => `
        <button class="grievance-item" type="button" data-id="${grievance.id}">
          <span class="gi-main">
            <span class="gi-title">${escapeHtml(grievance.subject)}</span>
            <span class="gi-meta">
              <span class="mono">${escapeHtml(grievance.code)}</span>
              <span>${escapeHtml(categoryLabel(grievance.category))}</span>
              <span>Filed ${escapeHtml(formatDate(grievance.createdAt))}</span>
              ${grievance.assignedTo ? `<span>Assigned: ${escapeHtml(grievance.assignedTo)}</span>` : ''}
            </span>
          </span>
          <span class="gi-side">
            ${priorityBadge(grievance.priority)}
            ${statusPill(grievance.status)}
            <svg class="gi-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </span>
        </button>
      `
    )
    .join('');
}

async function refresh() {
  try {
    const data = await api('/grievances');
    state.grievances = data.grievances;
  } catch (error) {
    toast(error.message, 'error');
    state.grievances = [];
  }
  renderKpis();
  renderList();
}

/* --------------------------------------------------------------- Drawer --- */

function closeDrawer() {
  el.modal.hidden = true;
  el.drawer.innerHTML = '';
  document.body.style.overflow = '';
}

function openDrawer(html) {
  el.drawer.innerHTML = html;
  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';

  el.drawer.querySelectorAll('[data-close-drawer]').forEach((button) => {
    button.addEventListener('click', closeDrawer);
  });
}

el.modal.addEventListener('click', (event) => {
  if (event.target === el.modal) closeDrawer();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !el.modal.hidden) closeDrawer();
});

async function openDetail(id) {
  try {
    const data = await api(`/grievances/${id}`);
    const grievance = data.grievance;

    openDrawer(`
      <div class="drawer-head">
        <div>
          <span class="mono muted mono--sm">${escapeHtml(grievance.code)}</span>
          <h2 class="drawer-title">${escapeHtml(grievance.subject)}</h2>
          <div class="meta">
            ${statusPill(grievance.status)}
            ${priorityBadge(grievance.priority)}
            <span>${escapeHtml(categoryLabel(grievance.category))}</span>
          </div>
        </div>
        <button class="icon-btn" type="button" data-close-drawer aria-label="Close details">${ICON.close}</button>
      </div>

      <div class="drawer-body">
        <dl class="detail-grid">
          <div class="detail"><dt>Submitted</dt><dd>${escapeHtml(formatDate(grievance.createdAt, true))}</dd></div>
          <div class="detail"><dt>Last updated</dt><dd>${escapeHtml(formatDate(grievance.updatedAt, true))}</dd></div>
          <div class="detail"><dt>Department</dt><dd>${escapeHtml(grievance.department)}</dd></div>
          <div class="detail"><dt>Assigned to</dt><dd>${escapeHtml(grievance.assignedTo || 'Not assigned yet')}</dd></div>
          ${
            grievance.location
              ? `<div class="detail full"><dt>Place / office</dt><dd>${escapeHtml(grievance.location)}</dd></div>`
              : ''
          }
        </dl>

        <div>
          <h3 class="drawer-section-title">Your description</h3>
          <div class="description-box">${escapeHtml(grievance.description)}</div>
        </div>

        <div>
          <h3 class="drawer-section-title">Timeline</h3>
          ${timelineHtml(data.updates)}
        </div>
      </div>
    `);
  } catch (error) {
    toast(error.message, 'error');
  }
}

el.list.addEventListener('click', (event) => {
  const item = event.target.closest('[data-id]');
  if (item) openDetail(item.dataset.id);
});

/* --------------------------------------------------------------- Submit --- */

function showSuccess(grievance) {
  el.form.hidden = true;
  el.success.hidden = false;
  el.success.innerHTML = `
    <div class="success-card">
      <div class="success-top">
        <span class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
        </span>
        <div>
          <h3>Grievance submitted</h3>
          <p>The grievance cell has received your ticket. Keep this ID — it works on the track page without signing in.</p>
        </div>
      </div>

      <div class="code-row">
        <span class="code-value">${escapeHtml(grievance.code)}</span>
        <button class="btn btn--ghost btn--sm" type="button" data-copy-code="${escapeHtml(grievance.code)}">
          ${ICON.copy} Copy ID
        </button>
        <a class="btn btn--ghost btn--sm" href="/track?code=${encodeURIComponent(grievance.code)}">Track it</a>
      </div>

      <div class="success-actions">
        <button class="btn btn--sm" type="button" data-another>File another grievance</button>
        <button class="btn btn--ghost btn--sm" type="button" data-goto-mine>View my grievances</button>
      </div>
    </div>
  `;

  el.success.querySelector('[data-copy-code]').addEventListener('click', async (event) => {
    const copied = await copyText(event.currentTarget.dataset.copyCode);
    toast(copied ? 'Tracking ID copied.' : 'Could not copy — select the ID manually.', copied ? 'success' : 'error');
  });

  el.success.querySelector('[data-another]').addEventListener('click', () => {
    el.success.hidden = true;
    el.form.hidden = false;
    el.form.reset();
    el.form.querySelector('input[name="priority"][value="medium"]').checked = true;
    el.category.focus();
  });

  el.success.querySelector('[data-goto-mine]').addEventListener('click', () => {
    el.success.hidden = true;
    el.form.hidden = false;
    setTab('mine');
  });
}

el.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showFormError('');

  const category = el.form.category.value;
  const subject = el.form.subject.value.trim();
  const description = el.form.description.value.trim();
  const location = el.form.location.value.trim();
  const priorityInput = el.form.querySelector('input[name="priority"]:checked');
  const priority = priorityInput ? priorityInput.value : 'medium';

  if (!category) return showFormError('Please choose a category.');
  if (subject.length < 8) return showFormError('Subject must be at least 8 characters.');
  if (description.length < 25) return showFormError('Please describe the issue in at least 25 characters.');

  setBusy(true);
  try {
    const data = await api('/grievances', {
      method: 'POST',
      body: { category, subject, description, location, priority },
    });
    showSuccess(data.grievance);
    el.form.reset();
    await refresh();
    toast('Grievance submitted successfully.', 'success');
  } catch (error) {
    showFormError(error.message);
  } finally {
    setBusy(false);
  }
});

/* ----------------------------------------------------------------- Boot --- */

async function boot() {
  const user = await loadSession();

  if (!user) {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.replace(`/login?next=${next}`);
    return;
  }

  if (user.role === 'admin') {
    window.location.replace('/admin');
    return;
  }

  state.user = user;

  const firstName = user.name.split(' ')[0];
  el.greeting.textContent = `${firstName}'s grievances`;
  el.sub.textContent = `${user.rollNo || 'Student'} · ${user.department || 'Department not set'} · signed in as ${user.email}`;

  buildCategoryOptions();

  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get('category');
  if (requestedCategory) {
    const option = el.category.querySelector(`option[value="${requestedCategory}"]`);
    if (option) el.category.value = requestedCategory;
  }

  el.loading.hidden = true;
  el.dash.hidden = false;

  setTab(params.get('tab') === 'file' ? 'file' : 'mine');
  await refresh();
}

boot();
