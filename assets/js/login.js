/** Sign in and registration forms, sharing the same page. */

import { api, mountChrome, loadSession, escapeHtml, toast } from './app.js';

mountChrome('login');

const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = {
  login: document.getElementById('panel-login'),
  register: document.getElementById('panel-register'),
};

const nextParam = new URLSearchParams(window.location.search).get('next');
const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

function setTab(name) {
  for (const tab of tabs) {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  }
  for (const [key, panel] of Object.entries(panels)) {
    panel.hidden = key !== name;
  }
  if (window.location.hash !== `#${name}`) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${name}`);
  }
}

tabs.forEach((tab) => tab.addEventListener('click', () => setTab(tab.dataset.tab)));
setTab(window.location.hash === '#register' ? 'register' : 'login');

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = message
    ? `<div class="alert alert--error" role="alert">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
         <span>${escapeHtml(message)}</span>
       </div>`
    : '';
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || 'Please wait…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

/* ------------------------------------------------------------ Sign in --- */

const loginForm = document.getElementById('login-form');
const loginSubmit = document.getElementById('login-submit');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('login-error', '');

  const identifier = loginForm.identifier.value.trim();
  const password = loginForm.password.value;

  if (!identifier || !password) {
    showError('login-error', 'Enter your email or roll number and your password.');
    return;
  }

  setBusy(loginSubmit, true, 'Signing in…');
  try {
    const data = await api('/auth/login', { method: 'POST', body: { identifier, password } });
    const user = data.user;
    toast(`Signed in as ${user.name.split(' ')[0]}`, 'success');
    const destination = user.role === 'admin' ? '/admin' : safeNext || '/dashboard';
    window.location.href = destination;
  } catch (error) {
    showError('login-error', error.message);
    setBusy(loginSubmit, false);
  }
});

/* ----------------------------------------------------------- Register --- */

const registerForm = document.getElementById('register-form');
const registerSubmit = document.getElementById('register-submit');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('register-error', '');

  const name = registerForm.name.value.trim();
  const rollNo = registerForm.rollNo.value.trim();
  const department = registerForm.department.value;
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;
  const confirm = registerForm.confirm.value;

  if (name.length < 3) return showError('register-error', 'Please enter your full name.');
  if (!rollNo) return showError('register-error', 'Please enter your roll number.');
  if (!department) return showError('register-error', 'Please choose your department.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('register-error', 'Please enter a valid email address.');
  if (password.length < 8) return showError('register-error', 'Password must be at least 8 characters long.');
  if (password !== confirm) return showError('register-error', 'The two passwords do not match.');

  setBusy(registerSubmit, true, 'Creating account…');
  try {
    await api('/auth/register', {
      method: 'POST',
      body: { name, rollNo, department, email, password },
    });
    toast('Account created. Welcome to CampusCare.', 'success');
    window.location.href = safeNext || '/dashboard';
  } catch (error) {
    showError('register-error', error.message);
    setBusy(registerSubmit, false);
  }
});

/* --------------------------------------------------------------- Demo --- */

document.querySelectorAll('[data-demo]').forEach((button) => {
  button.addEventListener('click', () => {
    const isAdmin = button.dataset.demo === 'admin';
    setTab('login');
    loginForm.identifier.value = isAdmin ? 'admin@university.edu' : 'priya.sharma@student.university.edu';
    loginForm.password.value = isAdmin ? 'Admin@123' : 'Student@123';
    loginForm.password.focus();
  });
});

/* ------------------------------------------------------- Existing user --- */

loadSession().then((user) => {
  const note = document.getElementById('session-note');
  if (!user || !note) return;

  const href = user.role === 'admin' ? '/admin' : '/dashboard';
  note.innerHTML = `
    <div class="alert alert--info" role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
      <span>You are already signed in as <strong>${escapeHtml(user.name)}</strong>. <a href="${href}">Continue to your ${user.role === 'admin' ? 'admin console' : 'dashboard'}</a>.</span>
    </div>
  `;
});
