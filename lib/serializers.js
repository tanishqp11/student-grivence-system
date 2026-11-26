'use strict';

/** Convert snake_case database rows into the camelCase objects the API returns. */

function publicUser(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    rollNo: row.roll_no || null,
    department: row.department || null,
    createdAt: row.created_at,
  };
}

function publicGrievance(row) {
  return {
    id: row.id,
    code: row.code,
    studentName: row.student_name,
    rollNo: row.roll_no || null,
    department: row.department,
    category: row.category,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    location: row.location || null,
    status: row.status,
    assignedTo: row.assigned_to || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicUpdate(row) {
  return {
    id: row.id,
    status: row.status,
    note: row.note || '',
    author: row.author,
    createdAt: row.created_at,
  };
}

module.exports = { publicUser, publicGrievance, publicUpdate };
