import { useState } from 'react';
import { resetPassword as resetPasswordService } from '@/common/services/authService';
import {
  validateEmailField,
  validatePasswordField,
  validateConfirmPasswordField,
} from '@/common/utils/validation';

export const useResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = async (
    email: string,
    token: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    setError(null);
    setLoading(true);

    try {
      const emailValidation = validateEmailField(email);
      if (!emailValidation.isValid) throw new Error(emailValidation.error);

      if (!token?.trim()) throw new Error('Reset token is required');

      const passwordValidation = validatePasswordField(newPassword);
      if (!passwordValidation.isValid) throw new Error(passwordValidation.error);

      const confirmValidation = validateConfirmPasswordField(newPassword, confirmPassword);
      if (!confirmValidation.isValid) throw new Error(confirmValidation.error);

      await resetPasswordService({ email, token, new_password: newPassword });
    } catch (err: any) {
      const message = err?.message || 'Failed to reset password';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { resetPassword, loading, error };
};
