import { AlarmSeverity, AlarmThreshold } from '../types/dashboard';

// Define alarm thresholds for each parameter
export const ALARM_THRESHOLDS: Record<string, AlarmThreshold> = {
  temperature: {
    parameter: 'Temperature',
    low: { min: -10, max: 32 },      // Below 32°F
    medium: { min: 32, max: 100 },   // 32-100°F
    high: { min: 100, max: 150 },    // Above 100°F
  },
  static_pressure: {
    parameter: 'Static Pressure',
    low: { min: 0, max: 30 },        // Below 30 psi
    medium: { min: 30, max: 80 },    // 30-80 psi
    high: { min: 80, max: 150 },     // Above 80 psi
  },
  differential_pressure: {
    parameter: 'Differential Pressure',
    low: { min: 0, max: 100 },       // Below 100 IWC
    medium: { min: 100, max: 300 },  // 100-300 IWC
    high: { min: 300, max: 500 },    // Above 300 IWC
  },
  volume: {
    parameter: 'Volume',
    low: { min: 0, max: 5000 },      // Below 5000 MCF
    medium: { min: 5000, max: 15000 }, // 5000-15000 MCF
    high: { min: 15000, max: 25000 }, // Above 15000 MCF
  },
  total_volume_flow: {
    parameter: 'Total Volume Flow',
    low: { min: 0, max: 10000 },     // Below 10000 MCF/day
    medium: { min: 10000, max: 25000 }, // 10000-25000 MCF/day
    high: { min: 25000, max: 40000 }, // Above 25000 MCF/day
  },
};

/**
 * Determine the alarm severity for a given value and parameter
 */
export const getAlarmSeverity = (
  value: number,
  parameter: string
): AlarmSeverity | null => {
  const threshold = ALARM_THRESHOLDS[parameter];
  if (!threshold) return null;

  // Check high zone first (most critical)
  if (value >= threshold.high.min) {
    return 'high';
  }

  // Check medium zone
  if (value >= threshold.medium.min && value < threshold.high.min) {
    return 'medium';
  }

  // Check low zone
  if (value >= threshold.low.min && value < threshold.medium.min) {
    return 'low';
  }

  return null;
};

/**
 * Get alarm zone color for charts
 */
export const getAlarmZoneColor = (severity: AlarmSeverity | null): string => {
  switch (severity) {
    case 'high':
      return 'rgba(239, 68, 68, 0.15)'; // Red zone
    case 'medium':
      return 'rgba(245, 158, 11, 0.15)'; // Yellow zone
    case 'low':
      return 'rgba(34, 197, 94, 0.15)'; // Green zone
    default:
      return 'transparent';
  }
};

/**
 * Get alarm zone border color for charts
 */
export const getAlarmZoneBorderColor = (severity: AlarmSeverity | null): string => {
  switch (severity) {
    case 'high':
      return 'rgba(239, 68, 68, 0.5)';
    case 'medium':
      return 'rgba(245, 158, 11, 0.5)';
    case 'low':
      return 'rgba(34, 197, 94, 0.5)';
    default:
      return 'transparent';
  }
};

/**
 * Count alarms by severity from readings
 */
export const countAlarmsBySeverity = (
  values: number[],
  parameter: string
): { low: number; medium: number; high: number } => {
  const counts = { low: 0, medium: 0, high: 0 };

  values.forEach(value => {
    const severity = getAlarmSeverity(value, parameter);
    if (severity) {
      counts[severity]++;
    }
  });

  return counts;
};

/**
 * Get the most severe alarm from a set of values
 */
export const getMostSevereAlarm = (
  values: number[],
  parameter: string
): AlarmSeverity | null => {
  let mostSevere: AlarmSeverity | null = null;

  values.forEach(value => {
    const severity = getAlarmSeverity(value, parameter);

    if (severity === 'high') {
      mostSevere = 'high';
    } else if (severity === 'medium' && mostSevere !== 'high') {
      mostSevere = 'medium';
    } else if (severity === 'low' && !mostSevere) {
      mostSevere = 'low';
    }
  });

  return mostSevere;
};
