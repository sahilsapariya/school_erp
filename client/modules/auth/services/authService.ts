import { apiPost } from '@/common/services/api';
import { API_ENDPOINTS } from '@/common/constants/api';

export interface TenantChoice {
  id: string;
  name: string;
  subdomain: string;
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  tenant_id?: string;
  subdomain?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    email_verified: boolean;
    profile_picture_url?: string;
  };
  permissions?: string[];
  /** Plan-enabled feature keys for this tenant (e.g. ['attendance', 'fees_management']). Used to hide/disable UI and APIs. */
  enabled_features?: string[];
  /** When same email exists in multiple schools; app should show school picker then call login with tenant_id */
  requires_tenant_choice?: boolean;
  tenants?: TenantChoice[];
}

export interface MessageResponse {
  message: string;
}

// Updated based on backend returning {'email': email} in data
export interface RegisterResponse {
  email: string;
}

export const register = (data: { email: string; password: string; name?: string }) => {
  return apiPost<RegisterResponse>(API_ENDPOINTS.REGISTER, data);
};

export const login = (data: {
  email: string;
  password: string;
  tenant_id?: string;
  subdomain?: string;
}) => {
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
