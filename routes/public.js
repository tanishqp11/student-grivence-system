'use strict';

/** Endpoints that do not need a session: health, metadata and public counts. */

const { query } = require('../lib/db');
const { CATEGORIES, DEPARTMENTS, PRIORITIES, STATUSES, STATUS_LABELS } = require('../lib/constants');
const { sendJson } = require('../lib/http');

async function health(req, res) {
  const started = Date.now();
  await query('SELECT 1 AS ok');
  sendJson(res, 200, { ok: true, database: 'connected', latencyMs: Date.now() - started });
}

function meta(req, res) {
  sendJson(res, 200, {
    categories: CATEGORIES,
    departments: DEPARTMENTS,
    priorities: PRIORITIES,
    statuses: STATUSES.map((status) => ({ id: status, label: STATUS_LABELS[status] })),
  });
}

async function stats(req, res) {
  const byStatus = await query('SELECT status, COUNT(*) AS count FROM grievances GROUP BY status');

  const counts = { pending: 0, review: 0, resolved: 0, rejected: 0 };
  let total = 0;

  for (const row of byStatus.rows) {
    const count = Number(row.count) || 0;
    total += count;
    if (row.status in counts) counts[row.status] = count;
  }

  const resolved = await query(
    'SELECT created_at, updated_at FROM grievances WHERE status = $1',
    ['resolved']
  );

  let averageHours = 0;
  if (resolved.rows.length) {
    const totalHours = resolved.rows.reduce((sum, row) => {
      const start = new Date(row.created_at).getTime();
      const end = new Date(row.updated_at).getTime();
      return sum + Math.max(0, end - start) / 3600000;
    }, 0);
    averageHours = totalHours / resolved.rows.length;
  }

  sendJson(res, 200, {
    total,
    ...counts,
    resolutionRate: total ? Math.round((counts.resolved / total) * 100) : 0,
    avgResolutionHours: Math.round(averageHours),
  });
}

module.exports = { health, meta, stats };
