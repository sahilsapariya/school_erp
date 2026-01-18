import { apiPost } from '@/common/services/api';
import { API_ENDPOINTS } from '@/common/constants/api';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
  };
  permissions: string[];
}

export interface MessageResponse {
  message: string;
}

export const register = (data: { email: string; password: string }) => {
  return apiPost<MessageResponse>(API_ENDPOINTS.REGISTER, data);
};

export const login = (data: { email: string; password: string }) => {
  return apiPost<LoginResponse>(API_ENDPOINTS.LOGIN, data);
};

export const forgotPassword = (data: { email: string }) => {
  return apiPost<MessageResponse>(API_ENDPOINTS.FORGOT_PASSWORD, data);
};

export const resetPassword = (data: {
  email: string;
  token: string;
  new_password: string;
}) => {
  return apiPost<MessageResponse>(API_ENDPOINTS.RESET_PASSWORD, data);
};
