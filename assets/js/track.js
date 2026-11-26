/** Public tracking page: look up a grievance by its tracking ID. */

import {
  api,
  mountChrome,
  escapeHtml,
  formatDate,
  statusPill,
  priorityBadge,
  priorityLabel,
  categoryLabel,
  timelineHtml,
  ICON,
} from './app.js';

mountChrome('track');

const form = document.getElementById('track-form');
const input = document.getElementById('track-code');
const result = document.getElementById('track-result');

function stepper(status) {
  const labels = ['Submitted', 'In review', status === 'rejected' ? 'Closed' : 'Resolved'];
  const activeIndex = status === 'pending' ? 0 : status === 'review' ? 1 : 2;

  return `
    <ol class="stepper" aria-label="Grievance progress">
      ${labels
        .map((label, index) => {
          let className = '';
          if (status === 'resolved') className = 'is-done';
          else if (index < activeIndex) className = 'is-done';
          else if (index === activeIndex) className = 'is-current';

          return `
            <li class="stepper-item ${className}">
              <span class="dot">${className === 'is-done' ? ICON.check : index + 1}</span>
              <span>${label}</span>
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
}

function renderTicket(ticket, updates) {
  const closed = ticket.status === 'rejected';

  result.innerHTML = `
    <article class="ticket-result">
      <div class="ticket-result-head">
        <div>
          <span class="mono muted mono--sm">${escapeHtml(ticket.code)}</span>
          <h2 class="drawer-title">${escapeHtml(ticket.subject)}</h2>
          <div class="meta-row">
            <span>${escapeHtml(categoryLabel(ticket.category))}</span>
            <span>${escapeHtml(ticket.department)}</span>
            <span>Filed ${escapeHtml(formatDate(ticket.createdAt))}</span>
            <span>Last updated ${escapeHtml(formatDate(ticket.updatedAt, true))}</span>
          </div>
        </div>
        <div class="badge-row">
          ${priorityBadge(ticket.priority)}
          ${statusPill(ticket.status)}
        </div>
      </div>

      ${stepper(ticket.status)}

      <div class="ticket-result-body">
        ${
          closed
            ? `<p class="result-note">This grievance was closed by the cell. The closing remark below explains why — if you have new information you can reply to it with the grievance cell.</p>`
            : ''
        }

        <dl class="detail-grid">
          <div class="detail"><dt>Assigned to</dt><dd>${escapeHtml(ticket.assignedTo || 'Awaiting assignment')}</dd></div>
          <div class="detail"><dt>Priority</dt><dd>${escapeHtml(priorityLabel(ticket.priority))}</dd></div>
        </dl>

        <div>
          <h3 class="drawer-section-title">Activity timeline</h3>
          ${timelineHtml(updates)}
        </div>
      </div>
    </article>
  `;
}

function renderError(message) {
  result.innerHTML = `
    <div class="ticket-result">
      <div class="alert alert--error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

async function lookup(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    renderError('Enter the tracking ID from your acknowledgement.');
    return;
  }

  result.innerHTML = '<div class="ticket-result"><p class="muted">Looking up your grievance…</p></div>';

  try {
    const data = await api(`/track?code=${encodeURIComponent(code)}`);
    renderTicket(data.ticket, data.updates);
    const url = new URL(window.location.href);
    url.searchParams.set('code', code);
    history.replaceState(null, '', url.pathname + url.search);
  } catch (error) {
    renderError(error.message);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  lookup(input.value);
});

const initialCode = new URLSearchParams(window.location.search).get('code');
if (initialCode) {
  input.value = initialCode.toUpperCase();
  lookup(initialCode);
} else {
  input.focus();
}
