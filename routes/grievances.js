'use strict';

/** Filing, listing, reading, updating and publicly tracking grievances. */

const crypto = require('node:crypto');
const { query } = require('../lib/db');
const { HttpError, sendJson, readJsonBody, parseUrl } = require('../lib/http');
const {
  CATEGORY_IDS,
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  STATUS_LABELS,
} = require('../lib/constants');
const { text, oneOf, matchOption, assert } = require('../lib/validation');
const { requireUser, requireAdmin } = require('../lib/session');
const { publicGrievance, publicUpdate } = require('../lib/serializers');

/** A short human-friendly reference such as GRV-2026-8K2PA. */
function makeCode() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let index = 0; index < 5; index += 1) {
    suffix += alphabet[crypto.randomInt(alphabet.length)];
  }
  return `GRV-${new Date().getFullYear()}-${suffix}`;
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM grievances WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listUpdates(grievanceId) {
  const { rows } = await query(
    `SELECT id, status, note, author, created_at
       FROM grievance_updates
      WHERE grievance_id = $1
      ORDER BY created_at ASC, id ASC`,
    [grievanceId]
  );
  return rows.map(publicUpdate);
}

async function create(req, res) {
  const user = await requireUser(req);
  const body = await readJsonBody(req);

  const category = oneOf(body.category, CATEGORY_IDS);
  const priority = oneOf(body.priority, PRIORITIES) || 'medium';
  const subject = text(body.subject, 120);
  const description = text(body.description, 4000);
  const location = text(body.location, 120);

  assert(category, 'Please choose a grievance category.');
  assert(subject.length >= 8, 'Subject must be at least 8 characters.');
  assert(description.length >= 25, 'Please describe the issue in at least 25 characters.');

  let created = null;

  // Codes are random; retry in the unlikely event of a collision.
  for (let attempt = 0; attempt < 6 && !created; attempt += 1) {
    try {
      const { rows } = await query(
        `INSERT INTO grievances
           (id, code, user_id, student_name, roll_no, department, category, subject,
            description, priority, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
         RETURNING *`,
        [
          crypto.randomUUID(),
          makeCode(),
          user.id,
          user.name,
          user.roll_no,
          user.department || 'Other',
          category,
          subject,
          description,
          priority,
          location || null,
        ]
      );
      created = rows[0];
    } catch (error) {
      if (!/duplicate|unique|23505/i.test(String(error.message))) throw error;
    }
  }

  if (!created) throw new HttpError(500, 'Could not allocate a grievance ID. Please try again.');

  await query(
    `INSERT INTO grievance_updates (id, grievance_id, status, note, author)
     VALUES ($1, $2, 'pending', $3, $4)`,
    [
      crypto.randomUUID(),
      created.id,
      'Grievance submitted and queued for review by the grievance cell.',
      user.name,
    ]
  );

  sendJson(res, 201, { grievance: publicGrievance(created) });
}

async function list(req, res) {
  const user = await requireUser(req);
  const url = parseUrl(req);

  const conditions = [];
  const params = [];

  if (user.role === 'admin') {
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const priority = url.searchParams.get('priority');
    const department = matchOption(url.searchParams.get('department'), DEPARTMENTS);

    if (status && STATUSES.includes(status)) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (category && CATEGORY_IDS.includes(category)) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (department) {
      params.push(department);
      conditions.push(`department = $${params.length}`);
    }
    if (priority && PRIORITIES.includes(priority)) {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }
  } else {
    params.push(user.id);
    conditions.push(`user_id = $${params.length}`);
  }

  const search = text(url.searchParams.get('q'), 80).toLowerCase();
  if (search) {
    params.push(`%${search}%`);
    const position = params.length;
    conditions.push(
      `(LOWER(subject) LIKE $${position} OR LOWER(code) LIKE $${position}
        OR LOWER(student_name) LIKE $${position} OR LOWER(description) LIKE $${position})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM grievances ${where} ORDER BY created_at DESC`,
    params
  );

  sendJson(res, 200, { grievances: rows.map(publicGrievance) });
}

async function getOne(req, res, [id]) {
  const user = await requireUser(req);

  if (!/^[0-9a-fA-F-]{10,60}$/.test(id || '')) {
    throw new HttpError(400, 'Invalid grievance id.');
  }

  const grievance = await findById(id);
  if (!grievance) throw new HttpError(404, 'Grievance not found.');
  if (user.role !== 'admin' && grievance.user_id !== user.id) {
    throw new HttpError(403, 'You can only view your own grievances.');
  }

  sendJson(res, 200, {
    grievance: publicGrievance(grievance),
    updates: await listUpdates(id),
  });
}

async function update(req, res, [id]) {
  const admin = await requireAdmin(req);
  const body = await readJsonBody(req);

  const grievance = await findById(id);
  if (!grievance) throw new HttpError(404, 'Grievance not found.');

  const status = body.status === undefined ? grievance.status : oneOf(body.status, STATUSES);
  assert(status, 'Status must be pending, review, resolved or rejected.');

  const note = text(body.note, 2000);
  const assignedTo =
    body.assignedTo === undefined ? grievance.assigned_to : text(body.assignedTo, 120);

  if (status === grievance.status && !note && assignedTo === grievance.assigned_to) {
    throw new HttpError(400, 'Nothing to update - change the status or add a remark.');
  }

  const { rows } = await query(
    `UPDATE grievances
        SET status = $1, assigned_to = $2, updated_at = now()
      WHERE id = $3
      RETURNING *`,
    [status, assignedTo || null, id]
  );

  await query(
    `INSERT INTO grievance_updates (id, grievance_id, status, note, author)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      crypto.randomUUID(),
      id,
      status,
      note || `Status changed to ${STATUS_LABELS[status]}.`,
      admin.name,
    ]
  );

  sendJson(res, 200, {
    grievance: publicGrievance(rows[0]),
    updates: await listUpdates(id),
  });
}

/** Public endpoint: a tracking ID is all that is needed to read the timeline. */
async function track(req, res) {
  const url = parseUrl(req);
  const code = text(url.searchParams.get('code'), 24).toUpperCase();

  if (!code) throw new HttpError(400, 'Enter the grievance ID printed on your acknowledgement.');
  if (!/^GRV-[0-9]{4}-[A-Z0-9]{5}$/.test(code)) {
    throw new HttpError(400, 'That does not look like a valid grievance ID (example: GRV-2026-AB12C).');
  }

  const { rows } = await query('SELECT * FROM grievances WHERE code = $1', [code]);
  const grievance = rows[0];
  if (!grievance) throw new HttpError(404, 'No grievance found with that ID.');

  sendJson(res, 200, {
    ticket: {
      code: grievance.code,
      subject: grievance.subject,
      category: grievance.category,
      department: grievance.department,
      priority: grievance.priority,
      status: grievance.status,
      assignedTo: grievance.assigned_to || null,
      createdAt: grievance.created_at,
      updatedAt: grievance.updated_at,
    },
    updates: await listUpdates(grievance.id),
  });
}

module.exports = { create, list, getOne, update, track };
