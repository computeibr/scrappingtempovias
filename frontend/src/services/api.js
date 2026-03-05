import axios from 'axios';

const api = axios.create({
  baseURL: '/',
});

// Injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se token expirado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 400 || error.response?.status === 401) {
      const msg = error.response?.data?.mensagem || '';
      if (msg.includes('login')) {
        localStorage.removeItem('tv_token');
        localStorage.removeItem('tv_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
