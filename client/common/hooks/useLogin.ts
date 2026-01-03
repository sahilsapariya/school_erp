import { useState } from 'react';
import { validateEmailField, validatePasswordField } from '@/common/utils/validation';
import { useAuth } from '@/common/hooks/useAuth';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: authLogin } = useAuth();

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const emailValidation = validateEmailField(email);
      if (!emailValidation.isValid) throw new Error(emailValidation.error);

      const passwordValidation = validatePasswordField(password);
      if (!passwordValidation.isValid) throw new Error(passwordValidation.error);

      await authLogin(email, password);
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
