import axios from 'axios';
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

const api = {
  async get(path, params = {}) {
    const headers = await authHeaders();
    const { data } = await axios.get(`${BASE_URL}${path}`, { params, headers });
    return data;
  },
  async post(path, body) {
    const headers = await authHeaders();
    const { data } = await axios.post(`${BASE_URL}${path}`, body, { headers });
    return data;
  },
  async patch(path, body) {
    const headers = await authHeaders();
    const { data } = await axios.patch(`${BASE_URL}${path}`, body, { headers });
    return data;
  },
};

export default api;
