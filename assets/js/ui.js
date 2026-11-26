/** Small interface helpers: toasts and clipboard copy. */

export function toast(message, tone = 'info') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const item = document.createElement('div');
  item.className = `toast${tone === 'error' ? ' is-error' : tone === 'success' ? ' is-success' : ''}`;
  item.setAttribute('role', 'status');
  item.textContent = message;
  stack.appendChild(item);

  window.setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(6px)';
    item.style.transition = 'opacity .2s ease, transform .2s ease';
    window.setTimeout(() => item.remove(), 220);
  }, 3600);
}

export async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
