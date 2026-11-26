'use strict';

/** Dashboard aggregates and the CSV export used by the grievance cell. */

const { query } = require('../lib/db');
const { STATUS_LABELS } = require('../lib/constants');
const { sendJson, sendText } = require('../lib/http');
const { requireAdmin } = require('../lib/session');
const { publicGrievance } = require('../lib/serializers');

function toCountMap(rows, key) {
  return rows.reduce((result, row) => {
    result[row[key]] = Number(row.count) || 0;
    return result;
  }, {});
}

function averageHours(rows) {
  if (!rows.length) return 0;

  const total = rows.reduce((sum, row) => {
    const start = new Date(row.created_at).getTime();
    const end = new Date(row.updated_at).getTime();
    return sum + Math.max(0, end - start) / 3600000;
  }, 0);

  return total / rows.length;
}

async function stats(req, res) {
  await requireAdmin(req);

  const byStatus = await query('SELECT status, COUNT(*) AS count FROM grievances GROUP BY status');
  const byCategory = await query('SELECT category, COUNT(*) AS count FROM grievances GROUP BY category');
  const byDepartment = await query('SELECT department, COUNT(*) AS count FROM grievances GROUP BY department');
  const byPriority = await query('SELECT priority, COUNT(*) AS count FROM grievances GROUP BY priority');
  const recent = await query('SELECT * FROM grievances ORDER BY created_at DESC LIMIT 5');
  const resolved = await query("SELECT created_at, updated_at FROM grievances WHERE status = 'resolved'");

  const counts = { pending: 0, review: 0, resolved: 0, rejected: 0 };
  let total = 0;

  for (const row of byStatus.rows) {
    const count = Number(row.count) || 0;
    total += count;
    if (row.status in counts) counts[row.status] = count;
  }

  sendJson(res, 200, {
    total,
    ...counts,
    avgResolutionHours: Math.round(averageHours(resolved.rows)),
    resolutionRate: total ? Math.round((counts.resolved / total) * 100) : 0,
    byCategory: toCountMap(byCategory.rows, 'category'),
    byDepartment: toCountMap(byDepartment.rows, 'department'),
    byPriority: toCountMap(byPriority.rows, 'priority'),
    recent: recent.rows.map(publicGrievance),
  });
}

function escapeCsv(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

async function exportCsv(req, res) {
  await requireAdmin(req);

  const { rows } = await query('SELECT * FROM grievances ORDER BY created_at DESC');

  const header = [
    'Grievance ID',
    'Student',
    'Roll No',
    'Department',
    'Category',
    'Subject',
    'Priority',
    'Status',
    'Assigned To',
    'Submitted On',
    'Last Updated',
  ];

  const lines = [header.map(escapeCsv).join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.code,
        row.student_name,
        row.roll_no || '',
        row.department,
        row.category,
        row.subject,
        row.priority,
        STATUS_LABELS[row.status] || row.status,
        row.assigned_to || 'Unassigned',
        new Date(row.created_at).toISOString(),
        new Date(row.updated_at).toISOString(),
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  sendText(res, 200, lines.join('\r\n'), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="grievances-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
}

module.exports = { stats, exportCsv };
