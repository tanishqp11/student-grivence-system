'use strict';

/**
 * Demonstration data used by `npm run db:init` and by the in-memory local
 * database, so the portal can be shown without typing every ticket by hand.
 */

const crypto = require('node:crypto');
const { hashPassword } = require('../lib/auth');

const DAY = 24 * 60 * 60 * 1000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000);

const STUDENTS = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@student.university.edu',
    rollNo: 'BCA2023-014',
    department: 'Computer Applications',
    password: 'Student@123',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.verma@student.university.edu',
    rollNo: 'BCA2023-027',
    department: 'Computer Applications',
    password: 'Student@123',
  },
];

const DEMO_GRIEVANCES = [
  {
    code: 'GRV-2026-8K2PA',
    student: 0,
    category: 'examination',
    subject: 'Revaluation result not declared for DBMS paper',
    description:
      'I applied for revaluation of the DBMS (BCA-304) paper on 12 October and paid the fee, but the revised result has still not appeared on the examination portal. The last date for the next semester registration is approaching and my internal marks are blocked because of this pending result.',
    priority: 'high',
    location: 'Examination Cell, Block B',
    status: 'review',
    assignedTo: 'Dr. Anil Kapoor (Examination Cell)',
    createdDays: 6,
    updates: [
      { day: 6, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
      { day: 5, status: 'review', note: 'Forwarded to the Examination Cell. Revaluation records are being verified.' },
      { day: 2, status: 'review', note: 'Answer script located, re-totalling in progress. Expected closure in 3 working days.' },
    ],
  },
  {
    code: 'GRV-2026-QM4TB',
    student: 1,
    category: 'hostel',
    subject: 'Water supply in Boys Hostel B is irregular since Monday',
    description:
      'The water supply to the second floor of Boys Hostel B has been intermittent since Monday morning. We get water only for around twenty minutes a day, which is not enough for the forty students living on this floor. The overhead tank was repaired last month but the problem has returned.',
    priority: 'urgent',
    location: 'Boys Hostel B, Second floor',
    status: 'pending',
    assignedTo: null,
    createdDays: 2,
    updates: [
      { day: 2, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
    ],
  },
  {
    code: 'GRV-2026-7XT9L',
    student: 0,
    category: 'faculty',
    subject: 'Lab sessions for Java programming are not being conducted',
    description:
      'The scheduled Java programming lab on Wednesday afternoons has been cancelled for three consecutive weeks without any substitute session. Practical file work and the upcoming internal practical exam both depend on these sessions.',
    priority: 'medium',
    location: 'Computer Lab 2',
    status: 'resolved',
    assignedTo: 'Prof. Meera Nair (Head, Computer Applications)',
    createdDays: 14,
    updates: [
      { day: 14, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
      { day: 13, status: 'review', note: 'Shared with the Head of Department for scheduling review.' },
      { day: 9, status: 'resolved', note: 'Two extra lab sessions scheduled on Fridays until the end of the semester. Attendance has been updated.' },
    ],
  },
  {
    code: 'GRV-2026-RR2CD',
    student: 1,
    category: 'fees',
    subject: 'Scholarship amount credited to the wrong bank account',
    description:
      'My state scholarship for the current academic year was credited to an old bank account that I closed last year. I submitted a bank detail correction form to the accounts office in August, but the payment was still sent to the closed account.',
    priority: 'high',
    location: 'Accounts Office',
    status: 'review',
    assignedTo: 'Accounts Section',
    createdDays: 4,
    updates: [
      { day: 4, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
      { day: 3, status: 'review', note: 'Accounts section is checking the scholarship disbursement record with the bank.' },
    ],
  },
  {
    code: 'GRV-2026-LM3WE',
    student: 0,
    category: 'infrastructure',
    subject: 'Broken projector in Lecture Hall 3',
    description:
      'The projector in Lecture Hall 3 has a flickering lamp and shuts down after about ten minutes of use. Two sections share this hall for presentations, and the issue has been reported verbally twice already without a repair.',
    priority: 'medium',
    location: 'Lecture Hall 3',
    status: 'pending',
    assignedTo: null,
    createdDays: 1,
    updates: [
      { day: 1, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
    ],
  },
  {
    code: 'GRV-2026-PD5NF',
    student: 1,
    category: 'other',
    subject: 'Reference books for Data Structures are unavailable',
    description:
      'All three reference copies of the prescribed Data Structures text are marked as available in the library catalogue, but none of them are on the shelf. The issue has been going on for two weeks and the librarian says the books may have been misplaced.',
    priority: 'low',
    location: 'Central Library',
    status: 'resolved',
    assignedTo: 'Central Library',
    createdDays: 20,
    updates: [
      { day: 20, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
      { day: 18, status: 'review', note: 'Library staff asked to trace the missing copies.' },
      { day: 16, status: 'resolved', note: 'Two copies were found in the returned trolley and one replacement copy has been ordered.' },
    ],
  },
  {
    code: 'GRV-2026-ZN6UH',
    student: 0,
    category: 'other',
    subject: 'Evening bus does not leave the city route on time',
    description:
      'The 5:30 pm college bus for the city route leaves before the scheduled time and does not stop at the main gate. Students who have a class until 5:15 pm regularly miss it and have to arrange private transport.',
    priority: 'medium',
    location: 'Main gate bus bay',
    status: 'rejected',
    assignedTo: 'Transport Office',
    createdDays: 11,
    updates: [
      { day: 11, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
      { day: 10, status: 'review', note: 'Transport office asked to review the departure log.' },
      { day: 8, status: 'rejected', note: 'The bus was rescheduled to 5:45 pm and the route change is already approved for this semester. Please contact the transport office if the issue repeats.' },
    ],
  },
  {
    code: 'GRV-2026-HK7VJ',
    student: 1,
    category: 'academic',
    subject: 'Internal assessment marks not uploaded for two subjects',
    description:
      'Internal assessment marks for Software Engineering and Computer Networks have not been uploaded on the student portal even though the answer sheets were returned a week ago. The portal shows a blank for both subjects, which affects the final consolidation.',
    priority: 'high',
    location: 'Student Portal',
    status: 'pending',
    assignedTo: null,
    createdDays: 3,
    updates: [
      { day: 3, status: 'pending', note: 'Grievance submitted and queued for review by the grievance cell.' },
    ],
  },
];

/**
 * Inserts demo students and grievances. Idempotent: existing students are
 * reused and demo grievances are skipped when the table already has rows.
 *
 * @param {(sql: string, params?: unknown[]) => Promise<{ rows: any[] }>} run
 */
async function seedDemo(run, { log = () => {} } = {}) {
  const studentIds = [];

  for (const student of STUDENTS) {
    const existing = await run('SELECT id FROM users WHERE email = $1', [student.email]);
    if (existing.rows.length) {
      studentIds.push(existing.rows[0].id);
      continue;
    }

    const id = crypto.randomUUID();
    await run(
      `INSERT INTO users (id, role, name, email, roll_no, department, password_hash)
       VALUES ($1, 'student', $2, $3, $4, $5, $6)`,
      [id, student.name, student.email, student.rollNo, student.department, hashPassword(student.password)]
    );
    studentIds.push(id);
    log(`Created student ${student.rollNo} (${student.email})`);
  }

  const count = await run('SELECT COUNT(*) AS total FROM grievances');
  if (Number(count.rows[0].total) > 0) {
    log('Grievances already exist - skipping demo tickets.');
    return;
  }

  for (const item of DEMO_GRIEVANCES) {
    const student = STUDENTS[item.student];
    const id = crypto.randomUUID();
    const lastUpdate = item.updates[item.updates.length - 1];

    await run(
      `INSERT INTO grievances
         (id, code, user_id, student_name, roll_no, department, category, subject, description,
          priority, location, status, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        item.code,
        studentIds[item.student],
        student.name,
        student.rollNo,
        student.department,
        item.category,
        item.subject,
        item.description,
        item.priority,
        item.location,
        item.status,
        item.assignedTo,
        ago(item.createdDays),
        ago(lastUpdate.day),
      ]
    );

    for (const update of item.updates) {
      await run(
        `INSERT INTO grievance_updates (id, grievance_id, status, note, author, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          id,
          update.status,
          update.note,
          update.status === 'pending' ? student.name : 'Grievance Cell',
          ago(update.day),
        ]
      );
    }
  }

  log(`Inserted ${DEMO_GRIEVANCES.length} demo grievances.`);
}

module.exports = { seedDemo, STUDENTS, DEMO_GRIEVANCES };
