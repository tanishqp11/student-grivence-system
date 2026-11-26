/** Grievance cell console: counts, charts, filters, table and update drawer. */

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
  STATUS_META,
  ICON,
} from './app.js';

mountChrome('admin');

const el = {
  gateLoading: document.getElementById('gate-loading'),
  gate: document.getElementById('admin-gate'),
  gateForm: document.getElementById('gate-form'),
  gateError: document.getElementById('gate-error'),
  gateSubmit: document.getElementById('gate-submit'),
  app: document.getElementById('admin-app'),
  sub: document.getElementById('admin-sub'),
  rows: document.getElementById('grievance-rows'),
  tableCount: document.getElementById('table-count'),
  tableEmpty: document.getElementById('table-empty'),
  chartCategory: document.getElementById('chart-category'),
  chartStatus: document.getElementById('chart-status'),
  filterQ: document.getElementById('filter-q'),
  filterStatus: document.getElementById('filter-status'),
  filterCategory: document.getElementById('filter-category'),
  filterDepartment: document.getElementById('filter-department'),
  refresh: document.getElementById('refresh-btn'),
  clear: document.getElementById('clear-filters'),
  modal: document.getElementById('detail-modal'),
  drawer: document.getElementById('detail-drawer'),
};

const state = {
  user: null,
  grievances: [],
  stats: null,
  filters: { q: '', status: '', category: '', department: '' },
};

/* ----------------------------------------------------------------- Gate --- */

function showGateError(message) {
  el.gateError.innerHTML = message
    ? `<div class="alert alert--error" role="alert">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
         <span>${escapeHtml(message)}</span>
       </div>`
    : '';
}

el.gateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showGateError('');

  const identifier = el.gateForm.identifier.value.trim();
  const password = el.gateForm.password.value;

  if (!identifier || !password) {
    showGateError('Enter the administrator email and password.');
    return;
  }

  el.gateSubmit.disabled = true;
  el.gateSubmit.textContent = 'Signing in…';

  try {
    const data = await api('/auth/login', { method: 'POST', body: { identifier, password } });

    if (data.user.role !== 'admin') {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      await loadSession({ force: true });
      showGateError('That account is a student account. The console needs an administrator login.');
      return;
    }

    state.user = data.user;
    el.gate.hidden = true;
    el.app.hidden = false;
    await refreshAll();
  } catch (error) {
    showGateError(error.message);
  } finally {
    el.gateSubmit.disabled = false;
    el.gateSubmit.textContent = 'Sign in to console';
  }
});

/* --------------------------------------------------------------- Render --- */

function formatAverage(hours) {
  if (!hours) return '—';
  if (hours < 24) return `${hours}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function renderStats() {
  const stats = state.stats;
  if (!stats) return;

  const values = {
    total: stats.total,
    pending: stats.pending,
    review: stats.review,
    resolved: stats.resolved,
    avg: formatAverage(stats.avgResolutionHours),
  };

  for (const [key, value] of Object.entries(values)) {
    const node = document.querySelector(`[data-kpi="${key}"]`);
    if (node) node.textContent = String(value);
  }

  const bars = (entries, total) => {
    if (!entries.length || !total) return '<p class="muted chart-empty">No data yet.</p>';

    const max = Math.max(...entries.map((entry) => entry.count), 1);
    return entries
      .map(
        (entry) => `
          <div class="bar-row">
            <span class="bar-label">${escapeHtml(entry.label)}</span>
            <span class="bar-track"><span class="bar-fill" style="width: ${Math.round((entry.count / max) * 100)}%"></span></span>
            <span class="bar-value">${entry.count}</span>
          </div>
        `
      )
      .join('');
  };

  const categoryEntries = Object.entries(stats.byCategory)
    .map(([key, count]) => ({ label: categoryLabel(key), count }))
    .sort((a, b) => b.count - a.count);

  const statusEntries = Object.entries(STATUS_META).map(([key, meta]) => ({
    label: meta.label,
    count: stats[key] || 0,
  }));

  el.chartCategory.innerHTML = bars(categoryEntries, stats.total);
  el.chartStatus.innerHTML = bars(statusEntries, stats.total);
}

function renderTable() {
  const count = state.grievances.length;
  el.tableCount.textContent = count === 1 ? '1 ticket' : `${count} tickets`;

  if (!count) {
    el.rows.innerHTML = '';
    el.tableEmpty.hidden = false;
    return;
  }

  el.tableEmpty.hidden = true;
  el.rows.innerHTML = state.grievances
    .map(
      (grievance) => `
        <tr data-id="${grievance.id}">
          <td>
            <span class="table-subject">${escapeHtml(grievance.subject)}</span>
            <span class="table-sub"><span class="mono">${escapeHtml(grievance.code)}</span> · ${escapeHtml(categoryLabel(grievance.category))}</span>
          </td>
          <td>
            ${escapeHtml(grievance.studentName)}
            <span class="table-sub">${escapeHtml(grievance.rollNo || '')}</span>
          </td>
          <td>${escapeHtml(grievance.department)}</td>
          <td>${statusPill(grievance.status)}</td>
          <td>${priorityBadge(grievance.priority)}</td>
          <td>${escapeHtml(formatDate(grievance.createdAt))}</td>
        </tr>
      `
    )
    .join('');
}

/* ----------------------------------------------------------------- Load --- */

function buildQuery() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function loadStats() {
  try {
    state.stats = await api('/admin/stats');
    renderStats();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadList() {
  try {
    const data = await api(`/grievances${buildQuery()}`);
    state.grievances = data.grievances;
    renderTable();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function refreshAll() {
  await Promise.all([loadStats(), loadList()]);
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

function statusOptions(current) {
  return Object.entries(STATUS_META)
    .map(
      ([value, meta]) =>
        `<option value="${value}"${value === current ? ' selected' : ''}>${escapeHtml(meta.label)}</option>`
    )
    .join('');
}

function renderDetail(grievance, updates) {
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
        <div class="detail"><dt>Student</dt><dd>${escapeHtml(grievance.studentName)}</dd></div>
        <div class="detail"><dt>Roll number</dt><dd>${escapeHtml(grievance.rollNo || '—')}</dd></div>
        <div class="detail"><dt>Department</dt><dd>${escapeHtml(grievance.department)}</dd></div>
        <div class="detail"><dt>Location</dt><dd>${escapeHtml(grievance.location || '—')}</dd></div>
        <div class="detail"><dt>Submitted</dt><dd>${escapeHtml(formatDate(grievance.createdAt, true))}</dd></div>
        <div class="detail"><dt>Last updated</dt><dd>${escapeHtml(formatDate(grievance.updatedAt, true))}</dd></div>
        <div class="detail full"><dt>Assigned officer</dt><dd>${escapeHtml(grievance.assignedTo || 'Unassigned')}</dd></div>
      </dl>

      <div>
        <h3 class="drawer-section-title">Description</h3>
        <div class="description-box">${escapeHtml(grievance.description)}</div>
      </div>

      <div>
        <h3 class="drawer-section-title">Timeline</h3>
        ${timelineHtml(updates)}
      </div>

      <div class="card card-pad">
        <h3 class="drawer-form-title">Update this grievance</h3>
        <p class="hint drawer-form-note">Every change is written to the timeline the student can see.</p>

        <form id="admin-update-form" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="update-status">Status</label>
              <select class="select" id="update-status" name="status">
                ${statusOptions(grievance.status)}
              </select>
            </div>
            <div class="field">
              <label for="update-assignee">Assigned officer / desk</label>
              <input
                class="input"
                id="update-assignee"
                name="assignedTo"
                maxlength="120"
                placeholder="e.g. Examination Cell"
                value="${escapeHtml(grievance.assignedTo || '')}"
              />
            </div>
            <div class="field span-2">
              <label for="update-note">Remark for the student</label>
              <textarea
                class="textarea"
                id="update-note"
                name="note"
                maxlength="2000"
                placeholder="What was checked, what action was taken, and what happens next."
              ></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn--sm" type="submit">Save update</button>
            <span class="micro">Leave the remark empty to only change the status.</span>
          </div>
        </form>
      </div>
    </div>
  `);

  const form = el.drawer.querySelector('#admin-update-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const status = form.status.value;
    const assignedTo = form.assignedTo.value.trim();
    const note = form.note.value.trim();

    if (status === grievance.status && !note && assignedTo === (grievance.assignedTo || '')) {
      toast('Change the status or add a remark first.', 'error');
      return;
    }

    button.disabled = true;
    button.textContent = 'Saving…';

    try {
      const data = await api(`/grievances/${grievance.id}`, {
        method: 'PATCH',
        body: { status, assignedTo, note },
      });
      toast('Grievance updated.', 'success');
      renderDetail(data.grievance, data.updates);
      await Promise.all([loadStats(), loadList()]);
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Save update';
    }
  });
}

async function openDetail(id) {
  try {
    const data = await api(`/grievances/${id}`);
    renderDetail(data.grievance, data.updates);
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* -------------------------------------------------------------- Filters --- */

el.rows.addEventListener('click', (event) => {
  const row = event.target.closest('[data-id]');
  if (row) openDetail(row.dataset.id);
});

let searchTimer = null;
el.filterQ.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.filters.q = el.filterQ.value.trim();
    loadList();
  }, 320);
});

for (const [element, key] of [
  [el.filterStatus, 'status'],
  [el.filterCategory, 'category'],
  [el.filterDepartment, 'department'],
]) {
  element.addEventListener('change', () => {
    state.filters[key] = element.value;
    loadList();
  });
}

el.clear.addEventListener('click', () => {
  state.filters = { q: '', status: '', category: '', department: '' };
  el.filterQ.value = '';
  el.filterStatus.value = '';
  el.filterCategory.value = '';
  el.filterDepartment.value = '';
  loadList();
});

el.refresh.addEventListener('click', async () => {
  el.refresh.disabled = true;
  await refreshAll();
  el.refresh.disabled = false;
  toast('Console refreshed.');
});

/* ----------------------------------------------------------------- Boot --- */

async function boot() {
  const user = await loadSession();
  el.gateLoading.hidden = true;

  if (!user || user.role !== 'admin') {
    el.gate.hidden = false;
    return;
  }

  state.user = user;
  el.sub.textContent = `Signed in as ${user.email} · triage, assign and close student grievances.`;
  el.gate.hidden = true;
  el.app.hidden = false;
  await refreshAll();
}

boot();
