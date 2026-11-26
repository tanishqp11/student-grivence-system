/** Labels, formatting and small HTML fragments shared by the pages. */

export const CATEGORY_LABELS = {
  academic: 'Academic',
  examination: 'Examination',
  hostel: 'Hostel & Mess',
  infrastructure: 'Infrastructure',
  faculty: 'Faculty Conduct',
  fees: 'Fees & Scholarship',
  harassment: 'Harassment / Ragging',
  other: 'Other',
};

export const STATUS_META = {
  pending: { label: 'Pending', className: 'pending' },
  review: { label: 'In review', className: 'review' },
  resolved: { label: 'Resolved', className: 'resolved' },
  rejected: { label: 'Closed', className: 'rejected' },
};

export const PRIORITY_META = {
  low: { label: 'Low', className: 'low' },
  medium: { label: 'Medium', className: 'medium' },
  high: { label: 'High', className: 'high' },
  urgent: { label: 'Urgent', className: 'urgent' },
};

export function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );
}

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return (withTime ? DATE_TIME : DATE).format(date);
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Other';
}

export function priorityLabel(priority) {
  const meta = PRIORITY_META[priority];
  return meta ? meta.label : priority;
}

export function statusPill(status) {
  const meta = STATUS_META[status] || { label: status, className: '' };
  return `<span class="pill pill--${meta.className}"><span class="dot"></span>${escapeHtml(meta.label)}</span>`;
}

export function priorityBadge(priority) {
  const meta = PRIORITY_META[priority] || { label: priority, className: 'low' };
  return `<span class="pill pill--${meta.className}">${escapeHtml(meta.label)}</span>`;
}

/** Timeline of status changes and remarks, newest event last. */
export function timelineHtml(updates) {
  if (!updates || !updates.length) {
    return '<p class="muted">No activity recorded yet.</p>';
  }

  const items = updates.map((update, index) => {
    const isLast = index === updates.length - 1;
    let modifier = '';
    if (isLast && update.status === 'resolved') modifier = 'is-resolved';
    else if (isLast && update.status === 'rejected') modifier = 'is-rejected';
    else if (isLast) modifier = 'is-active';

    return `
      <li class="timeline-item ${modifier}">
        <div class="timeline-head">
          ${statusPill(update.status)}
          <time datetime="${escapeHtml(update.createdAt)}">${escapeHtml(formatDate(update.createdAt, true))}</time>
        </div>
        <p class="timeline-note">${escapeHtml(update.note || '')}</p>
        <p class="timeline-author">${escapeHtml(update.author || 'Grievance Cell')}</p>
      </li>
    `;
  });

  return `<ol class="timeline">${items.join('')}</ol>`;
}
