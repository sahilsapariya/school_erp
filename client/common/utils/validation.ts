const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FieldValidation {
  isValid: boolean;
  error?: string;
}

export const isValidEmail = (email: string): boolean => {
  return email?.trim().length > 0 && EMAIL_REGEX.test(email.trim());
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateEmailField = (email: string): FieldValidation => {
  if (!email?.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  if (!isValidEmail(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

export const validatePasswordField = (password: string): FieldValidation => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  const validation = validatePassword(password);
  if (!validation.isValid) {
    return { isValid: false, error: validation.errors[0] };
  }
  return { isValid: true };
};

export const validateConfirmPasswordField = (
  password: string,
  confirmPassword: string
): FieldValidation => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true };
};
