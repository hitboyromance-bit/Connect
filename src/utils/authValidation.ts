import type { LoginFormValues, SignupFormValues, ValidationResult } from '../types';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blockedTypoDomains = new Map([
  ['gnail.com', 'gmail.com'],
  ['gamil.com', 'gmail.com'],
  ['gmial.com', 'gmail.com'],
  ['gmai.com', 'gmail.com'],
  ['hotnail.com', 'hotmail.com'],
  ['hotmai.com', 'hotmail.com'],
  ['yaho.com', 'yahoo.com'],
  ['yhoo.com', 'yahoo.com'],
  ['outlok.com', 'outlook.com'],
  ['outloo.com', 'outlook.com'],
]);

export function isValidEmail(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(trimmedEmail)) return false;

  const domain = trimmedEmail.split('@')[1];
  return !blockedTypoDomains.has(domain);
}

function getEmailError(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!emailPattern.test(trimmedEmail)) {
    return 'Please enter a valid email address';
  }

  const domain = trimmedEmail.split('@')[1];
  const suggestion = blockedTypoDomains.get(domain);
  if (suggestion) {
    return `Did you mean ${suggestion}?`;
  }

  return '';
}

export function validateLoginValues(values: LoginFormValues): ValidationResult {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else {
    const emailError = getEmailError(values.email);
    if (emailError) errors.email = emailError;
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSignupValues(values: SignupFormValues): ValidationResult {
  const errors: Record<string, string> = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else {
    const emailError = getEmailError(values.email);
    if (emailError) errors.email = emailError;
  }

  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
