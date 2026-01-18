import { getApiUrl } from '@/common/constants/api';
import { getAccessToken, getRefreshToken, setAccessToken } from '@/common/utils/storage';

export class ApiException extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.data = data;
  }
}

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = getApiUrl(endpoint);
  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (refreshToken) {
    headers['X-Refresh-Token'] = refreshToken;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle token refresh
    if (response.status === 401 && refreshToken) {
      const newToken = response.headers.get('X-New-Access-Token');
      if (newToken) {
        await setAccessToken(newToken);
        return apiRequest(endpoint, options);
      }
    }

    return response;
  } catch (error: any) {
      throw new ApiException(
      `Cannot connect to server. Please check your network connection.`,
        0,
        { originalError: error.message, url }
      );
    }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const isJson = response.headers.get('content-type')?.includes('application/json');

  let data: any;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch {
    throw new ApiException('Failed to parse response', response.status);
  }

  if (!response.ok) {
    throw new ApiException(
      data?.error || data?.message || 'An error occurred',
      response.status,
      data
    );
  }

  return data;
};

export const apiGet = async <T>(endpoint: string): Promise<T> => {
  const response = await apiRequest(endpoint, { method: 'GET' });
  return handleResponse<T>(response);
};

export const apiPost = async <T>(endpoint: string, body?: any): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};

export const apiPut = async <T>(endpoint: string, body?: any): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};

export const apiDelete = async <T>(endpoint: string): Promise<T> => {
  const response = await apiRequest(endpoint, { method: 'DELETE' });
  return handleResponse<T>(response);
};
