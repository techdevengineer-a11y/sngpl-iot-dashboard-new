import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await axios.post('/api/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Devices
export const getDevices = async () => {
  const response = await api.get('/devices/');
  return response.data;
};

export const getDeviceStats = async () => {
  const response = await api.get('/devices/stats');
  return response.data;
};

export const createDevice = async (deviceData) => {
  const response = await api.post('/devices/', deviceData);
  return response.data;
};

export const updateDevice = async (deviceId, deviceData) => {
  const response = await api.put(`/devices/${deviceId}`, deviceData);
  return response.data;
};

export const deleteDevice = async (deviceId) => {
  const response = await api.delete(`/devices/${deviceId}`);
  return response.data;
};

export const getDeviceReadings = async (deviceId, limit = 100) => {
  const response = await api.get(`/devices/${deviceId}/readings?limit=${limit}`);
  return response.data;
};

// Alarms
export const getAlarms = async (params = {}) => {
  const response = await api.get('/alarms/', { params });
  return response.data;
};

export const getAlarmStats = async () => {
  const response = await api.get('/alarms/stats');
  return response.data;
};

export const acknowledgeAlarm = async (alarmId) => {
  const response = await api.put(`/alarms/${alarmId}/acknowledge`);
  return response.data;
};

export const deleteAlarm = async (alarmId) => {
  const response = await api.delete(`/alarms/${alarmId}`);
  return response.data;
};

export const deleteAllAlarms = async () => {
  const response = await api.delete('/alarms/');
  return response.data;
};

export const getAlarmMonitoringStatus = async () => {
  const response = await api.get('/alarms/monitoring/status');
  return response.data;
};

export const toggleAlarmMonitoring = async () => {
  const response = await api.post('/alarms/monitoring/toggle');
  return response.data;
};

export const getThresholds = async () => {
  const response = await api.get('/alarms/thresholds');
  return response.data;
};

export const createThreshold = async (thresholdData) => {
  const response = await api.post('/alarms/thresholds', thresholdData);
  return response.data;
};

// Analytics
export const getReadings = async (params = {}) => {
  const response = await api.get('/analytics/readings', { params });
  return response.data;
};

export const getAnalyticsSummary = async (deviceId, days = 7) => {
  const response = await api.get(`/analytics/summary?device_id=${deviceId}&days=${days}`);
  return response.data;
};

export const exportReadingsCSV = async (params = {}) => {
  const response = await api.get('/analytics/readings/export/csv', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

// Notifications
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications/', { params });
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// Health
export const getHealth = async () => {
  const response = await axios.get('/api/health');
  return response.data;
};

// User Management
export const listUsers = (params) => api.get('/users/', { params });
export const getUser = (userId) => api.get(`/users/${userId}`);
export const createUser = (userData) => api.post('/users/', userData);
export const updateUser = (userId, userData) => api.put(`/users/${userId}`, userData);
export const deleteUser = (userId) => api.delete(`/users/${userId}`);
export const changePassword = (userId, passwords) => api.post(`/users/${userId}/change-password`, passwords);
export const resetPassword = (userId, newPassword) => api.post(`/users/${userId}/reset-password`, { new_password: newPassword });

// Audit Logs
export const getAuditLogs = (params) => api.get('/audit/', { params });
export const getUserActivity = (userId, days = 30) => api.get(`/audit/user/${userId}/summary`, { params: { days } });
export const getAuditActions = () => api.get('/audit/actions');
export const getAuditResourceTypes = () => api.get('/audit/resource-types');

// Backup Management
export const createBackup = (backupName = null) =>
  api.post('/backup/create', null, { params: backupName ? { backup_name: backupName } : {} });
export const listBackups = () => api.get('/backup/list');
export const restoreBackup = (filename, createSafety = true) =>
  api.post('/backup/restore', null, { params: { backup_filename: filename, create_safety_backup: createSafety } });
export const deleteBackup = (filename) => api.delete(`/backup/delete/${filename}`);
export const cleanupBackups = () => api.post('/backup/cleanup');
export const getBackupStats = () => api.get('/backup/stats');

// Data Retention
export const archiveReadings = (days = 90, deleteAfter = true) =>
  api.post('/retention/archive/readings', null, { params: { retention_days: days, delete_after_archive: deleteAfter } });
export const archiveAlarms = (days = 180, deleteAfter = false) =>
  api.post('/retention/archive/alarms', null, { params: { retention_days: days, delete_after_archive: deleteAfter } });
export const archiveAuditLogs = (days = 365, deleteAfter = false) =>
  api.post('/retention/archive/audit-logs', null, { params: { retention_days: days, delete_after_archive: deleteAfter } });
export const archiveAllData = () => api.post('/retention/archive/all');
export const getRetentionConfig = () => api.get('/retention/config');

// Report Exports
export const exportDevicesPDF = (params) => api.get('/reports/devices/pdf', { params, responseType: 'blob' });
export const exportDevicesExcel = (params) => api.get('/reports/devices/excel', { params, responseType: 'blob' });
export const exportAlarmsPDF = (params) => api.get('/reports/alarms/pdf', { params, responseType: 'blob' });
export const exportAlarmsExcel = (params) => api.get('/reports/alarms/excel', { params, responseType: 'blob' });

// Dashboard Detailed APIs
export const getDashboardRecentReadings = (limit = 20) => api.get('/dashboard/recent-readings', { params: { limit } });
export const getDashboardRecentAlarms = (limit = 5) => api.get('/dashboard/recent-alarms', { params: { limit } });
export const getSystemMetrics = () => api.get('/dashboard/system-metrics');
export const getParameterAverages = (hours = 24) => api.get('/dashboard/parameter-averages', { params: { hours } });
export const getStatusOverview = () => api.get('/dashboard/status-overview');

// Stations APIs
export const getStationStats = () => api.get('/stations/stats');
export const getStationDevices = (stationId) => api.get(`/stations/${stationId}/devices`);
export const getStationSummary = (stationId) => api.get(`/stations/${stationId}/summary`);

// Roles & Permissions APIs
export const getAllRoles = (includeInactive = false) => api.get('/roles/roles', { params: { include_inactive: includeInactive } });
export const getRole = (roleId) => api.get(`/roles/roles/${roleId}`);
export const createRole = (roleData) => api.post('/roles/roles', roleData);
export const deleteRole = (roleId) => api.delete(`/roles/roles/${roleId}`);
export const getAllPermissions = () => api.get('/roles/permissions');
export const getRolePermissions = (roleId) => api.get(`/roles/roles/${roleId}/permissions`);
export const assignPermissionToRole = (roleId, permissionId) => api.post(`/roles/roles/${roleId}/permissions/${permissionId}`);
export const removePermissionFromRole = (roleId, permissionId) => api.delete(`/roles/roles/${roleId}/permissions/${permissionId}`);
export const getUserPermissions = (userId) => api.get(`/roles/users/${userId}/permissions`);
export const assignRoleToUser = (userId, roleId) => api.post(`/roles/users/${userId}/roles/${roleId}`);
export const removeRoleFromUser = (userId, roleId) => api.delete(`/roles/users/${userId}/roles/${roleId}`);

export default api;
