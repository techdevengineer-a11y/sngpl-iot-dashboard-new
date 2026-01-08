import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  DeviceStats,
  AlarmStats,
  HealthStatus,
  Reading,
  Alarm,
  SystemMetrics,
  ParameterAverages,
  Device
} from '../types/dashboard';

// Fetch device statistics
export const useDeviceStats = () => {
  return useQuery<DeviceStats>({
    queryKey: ['deviceStats'],
    queryFn: async () => {
      const response = await api.get('/devices/stats');
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};

// Fetch alarm statistics
export const useAlarmStats = () => {
  return useQuery<AlarmStats>({
    queryKey: ['alarmStats'],
    queryFn: async () => {
      const response = await api.get('/alarms/stats');
      return response.data;
    },
    refetchInterval: 5000,
  });
};

// Fetch health status
export const useHealth = () => {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await api.get('/health');
      return response.data;
    },
    refetchInterval: 5000,
  });
};

// Fetch recent readings
export const useRecentReadings = (limit: number = 20) => {
  return useQuery<Reading[]>({
    queryKey: ['recentReadings', limit],
    queryFn: async () => {
      const response = await api.get(`/dashboard/recent-readings?limit=${limit}`);
      return response.data.reverse(); // Reverse for chronological order
    },
    refetchInterval: 5000,
  });
};

// Fetch recent alarms
export const useRecentAlarms = (limit: number = 5) => {
  return useQuery<Alarm[]>({
    queryKey: ['recentAlarms', limit],
    queryFn: async () => {
      const response = await api.get(`/dashboard/recent-alarms?limit=${limit}`);
      return response.data;
    },
    refetchInterval: 5000,
  });
};

// Fetch system metrics
export const useSystemMetrics = () => {
  return useQuery<SystemMetrics>({
    queryKey: ['systemMetrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/system-metrics');
      return response.data;
    },
    refetchInterval: 5000,
  });
};

// Fetch parameter averages
export const useParameterAverages = (hours: number = 24) => {
  return useQuery<ParameterAverages>({
    queryKey: ['parameterAverages', hours],
    queryFn: async () => {
      const response = await api.get(`/dashboard/parameter-averages?hours=${hours}`);
      return response.data;
    },
    refetchInterval: 5000,
  });
};

// Fetch devices
export const useDevices = () => {
  return useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await api.get('/devices/');
      return response.data;
    },
    refetchInterval: 10000,
  });
};
