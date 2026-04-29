const logoutWarning = 'Are you sure you want to log out? Unsaved changes may be lost.';

export function confirmLogout(confirmFn: (message: string) => boolean = window.confirm) {
  return confirmFn(logoutWarning);
}
