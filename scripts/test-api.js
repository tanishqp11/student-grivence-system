'use strict';

/**
 * API smoke test - runs the real serverless handler against an in-memory
 * Postgres emulator (pg-mem), so it needs no database or network.
 *
 *   npm test
 */

process.env.DATABASE_URL = '';
process.env.UGP_SEED_DEMO = '0';
process.env.AUTH_SECRET = 'test-secret-value';
process.env.ADMIN_EMAIL = 'admin@university.edu';
process.env.ADMIN_PASSWORD = 'Admin@123';

const handler = require('../api/index.js');

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function makeRes() {
  return {
    statusCode: 200,
    finished: false,
    headers: {},
    body: '',
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(chunk) {
      this.body = chunk === undefined ? '' : String(chunk);
      this.finished = true;
    },
  };
}

async function call(method, path, options = {}) {
  const req = {
    method,
    url: path,
    headers: { cookie: options.cookie || '' },
    body: options.body,
  };
  const res = makeRes();
  await handler(req, res);

  let data = null;
  try {
    data = JSON.parse(res.body);
  } catch {
    data = null;
  }
  return { status: res.statusCode, data, headers: res.headers, body: res.body };
}

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return raw ? String(raw).split(';')[0] : '';
}

async function main() {
  console.log('\nUniversity Grievance Portal - API smoke test\n');

  const health = await call('GET', '/api/health');
  check('GET /api/health reports a connected database', health.status === 200 && health.data.database === 'connected', JSON.stringify(health.data));

  const meta = await call('GET', '/api/meta');
  check('GET /api/meta returns categories and departments', meta.status === 200 && meta.data.categories.length === 8 && meta.data.departments.length >= 8);

  const emptyStats = await call('GET', '/api/stats');
  check('GET /api/stats starts at zero', emptyStats.status === 200 && emptyStats.data.total === 0, JSON.stringify(emptyStats.data));

  const weak = await call('POST', '/api/auth/register', {
    body: { name: 'Test Student', email: 'weak@student.university.edu', rollNo: 'BCA2024-001', department: 'Computer Applications', password: 'short' },
  });
  check('Registration rejects a short password', weak.status === 400, JSON.stringify(weak.data));

  const register = await call('POST', '/api/auth/register', {
    body: {
      name: 'Test Student',
      email: 'Test.Student@student.university.edu',
      rollNo: 'BCA2024-001',
      department: 'Computer Applications',
      password: 'Student@123',
    },
  });
  const studentCookie = cookieFrom({ headers: register.headers });
  check('Student can register', register.status === 201 && register.data.user.role === 'student', JSON.stringify(register.data));
  check('Registration normalises the email', register.data.user && register.data.user.email === 'test.student@student.university.edu');
  check('Registration sets an HttpOnly session cookie', /ugp_session=/.test(studentCookie) && /HttpOnly/i.test(register.headers['set-cookie']));

  const duplicate = await call('POST', '/api/auth/register', {
    body: { name: 'Test Student', email: 'test.student@student.university.edu', rollNo: 'BCA2024-001', department: 'Computer Applications', password: 'Student@123' },
  });
  check('Duplicate email/roll number is rejected', duplicate.status === 409, JSON.stringify(duplicate.data));

  const me = await call('GET', '/api/me', { cookie: studentCookie });
  check('GET /api/me returns the signed-in student', me.status === 200 && me.data.user && me.data.user.rollNo === 'BCA2024-001');

  const anonymous = await call('GET', '/api/me');
  check('GET /api/me returns null when signed out', anonymous.status === 200 && anonymous.data.user === null);

  const anonymousSubmit = await call('POST', '/api/grievances', {
    body: { category: 'academic', subject: 'Cannot submit without login', description: 'This request should be rejected by the API because there is no session.' },
  });
  check('Submitting requires a signed-in student', anonymousSubmit.status === 401, JSON.stringify(anonymousSubmit.data));

  const short = await call('POST', '/api/grievances', {
    cookie: studentCookie,
    body: { category: 'academic', subject: 'Too short', description: 'too short' },
  });
  check('Grievance validation rejects a short description', short.status === 400);

  const created = await call('POST', '/api/grievances', {
    cookie: studentCookie,
    body: {
      category: 'examination',
      subject: 'Revaluation result not published',
      description: 'I applied for revaluation three weeks ago and the revised marks are still not visible on the student portal.',
      priority: 'high',
      location: 'Examination Cell',
    },
  });
  const grievance = created.data && created.data.grievance;
  check('Student can submit a grievance', created.status === 201 && Boolean(grievance), JSON.stringify(created.data));
  check('Grievance ID follows the GRV-YYYY-XXXXX format', Boolean(grievance) && /^GRV-\d{4}-[A-Z0-9]{5}$/.test(grievance.code), grievance && grievance.code);
  check('New grievance starts as pending', Boolean(grievance) && grievance.status === 'pending');

  const list = await call('GET', '/api/grievances', { cookie: studentCookie });
  check('Student sees their own grievance list', list.status === 200 && list.data.grievances.length === 1);

  const track = await call('GET', `/api/track?code=${encodeURIComponent(grievance.code.toLowerCase())}`);
  check('Public tracking works with a lowercase ID', track.status === 200 && track.data.ticket.code === grievance.code, JSON.stringify(track.data));
  check('Tracking returns the submission event', track.status === 200 && track.data.updates.length === 1);

  const badTrack = await call('GET', '/api/track?code=NOPE');
  check('Tracking rejects a malformed ID', badTrack.status === 400);

  const adminLogin = await call('POST', '/api/auth/login', {
    body: { identifier: 'admin@university.edu', password: 'Admin@123' },
  });
  const adminCookie = cookieFrom({ headers: adminLogin.headers });
  check('Seeded administrator can sign in', adminLogin.status === 200 && adminLogin.data.user.role === 'admin', JSON.stringify(adminLogin.data));

  const badLogin = await call('POST', '/api/auth/login', {
    body: { identifier: 'test.student@student.university.edu', password: 'wrong-password' },
  });
  check('Wrong password is rejected', badLogin.status === 401);

  const studentPatch = await call('PATCH', `/api/grievances/${grievance.id}`, {
    cookie: studentCookie,
    body: { status: 'resolved', note: 'Trying to resolve my own grievance.' },
  });
  check('Students cannot change grievance status', studentPatch.status === 403, JSON.stringify(studentPatch.data));

  const adminPatch = await call('PATCH', `/api/grievances/${grievance.id}`, {
    cookie: adminCookie,
    body: { status: 'review', note: 'Forwarded to the examination cell for verification.', assignedTo: 'Examination Cell' },
  });
  check('Administrator can update status and add a remark', adminPatch.status === 200 && adminPatch.data.grievance.status === 'review', JSON.stringify(adminPatch.data));
  check('Timeline records both the submission and the admin remark', adminPatch.status === 200 && adminPatch.data.updates.length === 2);
  check('Assignment is stored', adminPatch.status === 200 && adminPatch.data.grievance.assignedTo === 'Examination Cell');

  const adminList = await call('GET', '/api/grievances?status=review', { cookie: adminCookie });
  check('Admin list filters by status', adminList.status === 200 && adminList.data.grievances.length === 1);

  const adminStats = await call('GET', '/api/admin/stats', { cookie: adminCookie });
  check('Admin stats summarise the tickets', adminStats.status === 200 && adminStats.data.total === 1 && adminStats.data.review === 1, JSON.stringify(adminStats.data));
  check('Admin stats break down by category', adminStats.status === 200 && adminStats.data.byCategory.examination === 1);

  const forbiddenStats = await call('GET', '/api/admin/stats', { cookie: studentCookie });
  check('Students cannot read admin stats', forbiddenStats.status === 403);

  const csv = await call('GET', '/api/admin/export', { cookie: adminCookie });
  check('Admin CSV export returns a CSV document', csv.status === 200 && /text\/csv/.test(csv.headers['content-type']) && csv.body.startsWith('"Grievance ID"'));

  const second = await call('POST', '/api/auth/register', {
    body: { name: 'Second Student', email: 'second@student.university.edu', rollNo: 'BCA2024-002', department: 'Computer Applications', password: 'Student@123' },
  });
  const secondCookie = cookieFrom({ headers: second.headers });
  check('Second student can register', second.status === 201);

  const foreign = await call('GET', `/api/grievances/${grievance.id}`, { cookie: secondCookie });
  check("A student cannot open another student's grievance", foreign.status === 403, JSON.stringify(foreign.data));

  const foreignList = await call('GET', '/api/grievances', { cookie: secondCookie });
  check('A student only sees their own tickets', foreignList.status === 200 && foreignList.data.grievances.length === 0);

  const logout = await call('POST', '/api/auth/logout', { cookie: studentCookie });
  check('Logout clears the session cookie', logout.status === 200 && /Max-Age=0/.test(String(logout.headers['set-cookie'])));

  const statsAfter = await call('GET', '/api/stats');
  check('Public stats expose no personal data', statsAfter.status === 200 && statsAfter.data.total === 1 && !('subject' in statsAfter.data));

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    console.log('Failed checks:');
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nTest run crashed:', error);
  process.exit(1);
});
