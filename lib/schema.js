'use strict';

/**
 * Database DDL used at runtime by lib/db.js.
 *
 * It lives in a JS module (not a .sql file read with fs) so Vercel's function
 * bundler always includes it. `db/schema.sql` holds the same DDL as a readable
 * reference for the project report.
 */

module.exports = `
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  role          text NOT NULL DEFAULT 'student',
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  roll_no       text UNIQUE,
  department    text,
  password_hash text NOT NULL,
  created_at    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grievances (
  id            text PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  user_id       text NOT NULL REFERENCES users (id),
  student_name  text NOT NULL,
  roll_no       text,
  department    text NOT NULL,
  category      text NOT NULL,
  subject       text NOT NULL,
  description   text NOT NULL,
  priority      text NOT NULL DEFAULT 'medium',
  location      text,
  status        text NOT NULL DEFAULT 'pending',
  assigned_to   text,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grievance_updates (
  id           text PRIMARY KEY,
  grievance_id text NOT NULL REFERENCES grievances (id),
  status       text NOT NULL,
  note         text,
  author       text NOT NULL,
  created_at   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grievances_user_idx ON grievances (user_id);
CREATE INDEX IF NOT EXISTS grievances_status_idx ON grievances (status);
CREATE INDEX IF NOT EXISTS grievance_updates_grievance_idx ON grievance_updates (grievance_id);
`;
