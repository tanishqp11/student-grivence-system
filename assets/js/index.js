/** Landing page: fetch aggregate counts and fill the statistics strip. */

import { api, mountChrome } from './app.js';

mountChrome('home');

const formatter = new Intl.NumberFormat('en-IN');

function setStat(key, value) {
  const node = document.querySelector(`[data-stat="${key}"]`);
  if (node) node.textContent = value;
}

function averageResolution(hours) {
  if (!hours) return '—';
  if (hours < 24) return `${hours} hrs`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} days`;
}

async function loadStats() {
  try {
    const stats = await api('/stats');
    setStat('total', formatter.format(stats.total));

    if (!stats.total) {
      setStat('resolved', '0');
      setStat('rate', '—');
      setStat('avg', '—');
      return;
    }

    setStat('resolved', formatter.format(stats.resolved));
    setStat('rate', `${stats.resolutionRate}%`);
    setStat('avg', averageResolution(stats.avgResolutionHours));
  } catch {
    setStat('total', '—');
    setStat('resolved', '—');
    setStat('rate', '—');
    setStat('avg', '—');
  }
}

loadStats();
