import axios from 'axios';

const AUTH_URL = 'http://localhost:3001';
const INCIDENT_URL = 'http://localhost:3002';
const DISPATCH_URL = 'http://localhost:3003';
const ANALYTICS_URL = 'http://localhost:3004';

const createInstance = (baseURL) => {
  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          // Get new access token
          const res = await axios.post(`${AUTH_URL}/auth/refresh-token`, { refreshToken });
          const newToken = res.data.accessToken;
          const newRefresh = res.data.refreshToken;

          // Save new tokens
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefresh);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed — log out
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export const authAPI = createInstance(AUTH_URL);
export const incidentAPI = createInstance(INCIDENT_URL);
export const dispatchAPI = createInstance(DISPATCH_URL);
export const analyticsAPI = createInstance(ANALYTICS_URL);