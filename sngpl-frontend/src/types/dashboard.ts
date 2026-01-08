// Alarm severity levels
export type AlarmSeverity = 'low' | 'medium' | 'high';

// Reading data structure
export interface Reading {
  client_id: string;
  device_id: string;
  temperature: number;
  static_pressure: number;
  differential_pressure: number;
  volume: number;
  total_volume_flow: number;
  timestamp: string;
}

// Alarm structure
export interface Alarm {
  id: number;
  client_id: string;
  device_id: string;
  parameter: string;
  value: number;
  threshold_type: string;
  severity: AlarmSeverity;
  triggered_at: string;
  is_acknowledged: boolean;
}

// Device stats
export interface DeviceStats {
  total_devices: number;
  active_devices: number;
  inactive_devices: number;
}

// Alarm stats
export interface AlarmStats {
  active_alarms: number;
  total_alarms: number;
  critical_alarms: number;
  low_alarms?: number;
  medium_alarms?: number;
  high_alarms?: number;
}

// Health status
export interface HealthStatus {
  mqtt_connected: boolean;
  database_connected?: boolean;
}

// System metrics
export interface SystemMetrics {
  total_readings: number;
  readings_per_minute: number;
  uptime_percentage: number;
  readings_last_hour: number;
}

// Parameter averages
export interface ParameterAverages {
  temperature: number;
  static_pressure: number;
  differential_pressure: number;
  volume: number;
  total_volume_flow: number;
  sample_count: number;
  period_hours: number;
}

// Device info
export interface Device {
  client_id: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  location?: string;
  is_active: boolean;
}

// Alarm thresholds for each parameter
export interface AlarmThreshold {
  parameter: string;
  low: { min: number; max: number };
  medium: { min: number; max: number };
  high: { min: number; max: number };
}

// Chart data point with alarm zones
export interface ChartDataPoint {
  time: string;
  value: number;
  device?: string;
  alarmZone?: AlarmSeverity | null;
}

// Alarm status for a parameter
export interface ParameterAlarmStatus {
  parameter: string;
  currentValue: number;
  severity: AlarmSeverity | null;
  lowCount: number;
  mediumCount: number;
  highCount: number;
  thresholds: AlarmThreshold;
}
