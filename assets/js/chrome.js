/** Shared header and footer, mounted into every page. */

import { loadSession, signOut } from './session.js';
import { escapeHtml } from './format.js';
import { ICON } from './icons.js';

const HEADER_TEMPLATE = `
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/">
        <span class="brand-mark">${ICON.logo}</span>
        <span class="brand-text"><strong>CampusCare</strong><small>Grievance Portal</small></span>
      </a>

      <nav class="nav" aria-label="Primary">
        <a class="nav-link" data-nav="home" href="/">Home</a>
        <a class="nav-link" data-nav="track" href="/track">Track status</a>
        <a class="nav-link" href="/#categories">Categories</a>
        <a class="nav-link" href="/#how-it-works">How it works</a>
        <a class="nav-link" data-nav="admin" href="/admin">Admin</a>
      </nav>

      <div class="nav-actions" id="nav-actions">
        <a class="btn btn--ghost btn--sm" href="/login">Sign in</a>
        <a class="btn btn--sm" href="/dashboard">File a grievance</a>
      </div>

      <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">
        ${ICON.menu}
      </button>
    </div>
  </header>
`;

const FOOTER_TEMPLATE = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="/">
            <span class="brand-mark">${ICON.logo}</span>
            <span class="brand-text"><strong>CampusCare</strong><small>Grievance Portal</small></span>
          </a>
          <p>The university's portal for student grievances. Every complaint is logged, routed to the responsible department and tracked until it is closed.</p>
        </div>

        <div class="footer-col">
          <h4>Students</h4>
          <ul>
            <li><a href="/login">Sign in</a></li>
            <li><a href="/login#register">Create an account</a></li>
            <li><a href="/dashboard?tab=file">File a grievance</a></li>
            <li><a href="/track">Track a grievance</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Grievance cell</h4>
          <ul>
            <li><a href="/admin">Admin console</a></li>
            <li><a href="/#how-it-works">Escalation policy</a></li>
            <li><a href="/#faq">Frequently asked</a></li>
            <li><a href="/api/health">API health</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Office</h4>
          <ul>
            <li><a href="mailto:grievance@university.edu">grievance@university.edu</a></li>
            <li><a href="tel:+911234567890">+91 12345 67890</a></li>
            <li>Room 104, Admin Block</li>
            <li>Mon-Fri, 10:00-17:00</li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} CampusCare, Student Grievance Redressal Cell</span>
        <span>BCA minor project, data stored in PostgreSQL</span>
      </div>
    </div>
  </footer>
`;

export function mountChrome(activePage) {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');

  if (header) {
    header.innerHTML = HEADER_TEMPLATE;

    const activeLink = header.querySelector(`[data-nav="${activePage}"]`);
    if (activeLink) activeLink.classList.add('is-active');

    const toggle = header.querySelector('#nav-toggle');
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? ICON.close : ICON.menu;
    });
  }

  if (footer) footer.innerHTML = FOOTER_TEMPLATE;

  loadSession().then((user) => {
    const actions = document.getElementById('nav-actions');
    if (!actions || !user) return;

    const initials = user.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || '')
      .join('')
      .toUpperCase();

    const isAdmin = user.role === 'admin';

    actions.innerHTML = `
      <a class="btn btn--ghost btn--sm" href="${isAdmin ? '/admin' : '/dashboard'}">
        ${isAdmin ? 'Admin console' : 'Dashboard'}
      </a>
      <span class="user-chip"><span class="avatar">${escapeHtml(initials || 'U')}</span><span class="name">${escapeHtml(user.name)}</span></span>
      <button class="btn btn--sm" type="button" data-sign-out>Sign out</button>
    `;

    actions.querySelector('[data-sign-out]').addEventListener('click', signOut);
  });
}
