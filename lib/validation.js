'use strict';

const { HttpError } = require('./http');

/** Trimmed string, capped at maxLength characters. */
function text(value, maxLength = 5000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/** Lower-case value only when it belongs to a fixed list of ids. */
function oneOf(value, allowed) {
  const cleaned = text(value, 60).toLowerCase();
  return allowed.includes(cleaned) ? cleaned : null;
}

/** Case-insensitive match that returns the canonical spelling from the list. */
function matchOption(value, allowed) {
  const cleaned = text(value, 80).toLowerCase();
  if (!cleaned) return null;
  return allowed.find((option) => option.toLowerCase() === cleaned) || null;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isRollNumber(value) {
  return /^[A-Z0-9][A-Z0-9/-]{3,19}$/.test(value);
}

/** Throws a 400 with the given message when the condition is false. */
function assert(condition, message) {
  if (!condition) throw new HttpError(400, message);
}

module.exports = { text, oneOf, matchOption, isEmail, isRollNumber, assert };
