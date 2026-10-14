import Swal from 'sweetalert2';

// One place for feedback, so pages stop hand-rolling Swal calls that drift
// apart in styling. Styled to the panel's own dark palette rather than the
// affiliate portal's gold.

const SWAL_BASE = {
  background: '#212b42',
  color: '#e6eaf3',
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#374362',
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
    ...(danger ? { confirmButtonColor: '#dc2626' } : {}),
  });
  return Boolean(result.isConfirmed);
}
