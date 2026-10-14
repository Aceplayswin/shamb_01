import Swal from 'sweetalert2';

// One place for feedback, so pages stop hand-rolling Swal calls that drift
// apart in styling. Ported from dollara/admin's AdminShell.

const SWAL_BASE = {
  background: '#0f172a',
  color: '#e2e8f0',
  confirmButtonColor: '#f5c542',
  cancelButtonColor: '#334155',
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  ...SWAL_BASE,
});

export const toast = {
  success: (title) => Toast.fire({ icon: 'success', title }),
  error: (title) => Toast.fire({ icon: 'error', title }),
  info: (title) => Toast.fire({ icon: 'info', title }),
};

/** Awaitable yes/no. Resolves true when the user confirms. */
export async function confirmDialog({
  title,
  text,
  confirmText = 'Confirm',
  icon = 'question',
  danger = false,
}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    ...SWAL_BASE,
    ...(danger ? { confirmButtonColor: '#e11d48' } : {}),
  });
  return Boolean(result.isConfirmed);
}

/**
 * Show something exactly once, with no way to dismiss by accident.
 * Used for the API private key, which is never recoverable afterwards.
 */
export async function revealOnce({ title, html, confirmText = 'I have saved it' }) {
  return Swal.fire({
    title,
    html,
    icon: 'warning',
    confirmButtonText: confirmText,
    allowOutsideClick: false,
    allowEscapeKey: false,
    width: 640,
    ...SWAL_BASE,
  });
}
