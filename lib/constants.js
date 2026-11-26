'use strict';

/** Value lists shared by validation, the API and the reports. */

const CATEGORIES = [
  { id: 'academic', label: 'Academic' },
  { id: 'examination', label: 'Examination' },
  { id: 'hostel', label: 'Hostel & Mess' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'faculty', label: 'Faculty Conduct' },
  { id: 'fees', label: 'Fees & Scholarship' },
  { id: 'harassment', label: 'Harassment / Ragging' },
  { id: 'other', label: 'Other' },
];

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);

const DEPARTMENTS = [
  'Computer Applications',
  'Management',
  'Commerce',
  'Arts & Humanities',
  'Science',
  'Law',
  'Education',
  'Administration',
  'Other',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUSES = ['pending', 'review', 'resolved', 'rejected'];

const STATUS_LABELS = {
  pending: 'Pending',
  review: 'In review',
  resolved: 'Resolved',
  rejected: 'Closed',
};

module.exports = {
  CATEGORIES,
  CATEGORY_IDS,
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  STATUS_LABELS,
};
