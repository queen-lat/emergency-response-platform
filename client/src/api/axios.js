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
  return instance;
};

export const authAPI = createInstance(AUTH_URL);
export const incidentAPI = createInstance(INCIDENT_URL);
export const dispatchAPI = createInstance(DISPATCH_URL);
export const analyticsAPI = createInstance(ANALYTICS_URL);
