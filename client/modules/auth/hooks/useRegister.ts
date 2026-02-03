import { useState } from 'react';
import { register as registerService } from '@/modules/auth/services/authService';
import { validateEmailField, validatePasswordField } from '@/common/utils/validation';

export const useRegister = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const emailValidation = validateEmailField(email);
      if (!emailValidation.isValid) throw new Error(emailValidation.error);

      const passwordValidation = validatePasswordField(password);
      if (!passwordValidation.isValid) throw new Error(passwordValidation.error);

      await registerService({ email, password });
    } catch (err: any) {
      const message = err?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
};
