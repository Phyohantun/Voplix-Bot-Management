const MIN_LENGTH = 6;

/** Owner signup: min length + lowercase, uppercase, digit, symbol. */
export function validateOwnerPasswordStrength(password: string): { ok: true } | { ok: false; message: string } {
  if (password.length < MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: 'Password must include a lowercase letter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: 'Password must include an uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: 'Password must include a number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: 'Password must include a symbol.' };
  }
  return { ok: true };
}
