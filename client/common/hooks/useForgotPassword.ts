import { useState } from 'react';
import { forgotPassword as forgotPasswordService } from '@/common/services/authService';
import { validateEmailField } from '@/common/utils/validation';

export const useForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const forgotPassword = async (email: string) => {
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const emailValidation = validateEmailField(email);
      if (!emailValidation.isValid) throw new Error(emailValidation.error);

      await forgotPasswordService({ email });
      setSuccess(true);
    } catch (err: any) {
      const message = err?.message || 'Failed to send reset email';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { forgotPassword, loading, error, success };
};
