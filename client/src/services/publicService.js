import axios from 'axios';
import { normalizedBase } from './api';

// Public scans need neither session cookies nor authentication headers.
const publicApi = axios.create({ baseURL: normalizedBase });

export const publicService = {
  async getEmergencyProfile(token, options = {}) {
    try {
      const res = await publicApi.get(`/public/emergency/${encodeURIComponent(token)}`, options);
      return res.data;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(error.response?.data?.message || error.message || 'Unable to load emergency profile.');
    }
  }
};
