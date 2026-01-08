import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alarm } from '../types/dashboard';
import AlarmIndicator from './AlarmIndicator';

interface DeviceAlarmCount {
  client_id: string;
  device_name?: string;
  total_alarms: number;
  low_count: number;
  medium_count: number;
  high_count: number;
  last_alarm_time: string;
}

interface TopAlertingDevicesProps {
  alarms: Alarm[];
}

const TopAlertingDevices: React.FC<TopAlertingDevicesProps> = ({ alarms }) => {
  const navigate = useNavigate();

  // Aggregate alarms by device
  const deviceAlarmMap = new Map<string, DeviceAlarmCount>();

  alarms.forEach(alarm => {
    const existing = deviceAlarmMap.get(alarm.client_id);

    if (existing) {
      existing.total_alarms++;
      if (alarm.severity === 'low') existing.low_count++;
      else if (alarm.severity === 'medium') existing.medium_count++;
      else if (alarm.severity === 'high') existing.high_count++;

      // Update last alarm time if more recent
      if (new Date(alarm.triggered_at) > new Date(existing.last_alarm_time)) {
        existing.last_alarm_time = alarm.triggered_at;
      }
    } else {
      deviceAlarmMap.set(alarm.client_id, {
        client_id: alarm.client_id,
        device_name: alarm.device_id,
        total_alarms: 1,
        low_count: alarm.severity === 'low' ? 1 : 0,
        medium_count: alarm.severity === 'medium' ? 1 : 0,
        high_count: alarm.severity === 'high' ? 1 : 0,
        last_alarm_time: alarm.triggered_at
      });
    }
  });

  // Convert to array and sort by total alarms (descending)
  let topDevices = Array.from(deviceAlarmMap.values())
    .sort((a, b) => b.total_alarms - a.total_alarms)
    .slice(0, 5); // Top 5 devices

  // Add dummy data if no alarms exist
  if (topDevices.length === 0) {
    const now = new Date();
    const dummyDevices: DeviceAlarmCount[] = [
      {
        client_id: 'MTR-001',
        device_name: 'Meter Station Alpha',
        total_alarms: 15,
        low_count: 8,
        medium_count: 5,
        high_count: 2,
        last_alarm_time: new Date(now.getTime() - 5 * 60000).toISOString() // 5 min ago
      },
      {
        client_id: 'MTR-002',
        device_name: 'Meter Station Beta',
        total_alarms: 12,
        low_count: 7,
        medium_count: 4,
        high_count: 1,
        last_alarm_time: new Date(now.getTime() - 15 * 60000).toISOString() // 15 min ago
      },
      {
        client_id: 'MTR-003',
        device_name: 'Meter Station Gamma',
        total_alarms: 9,
        low_count: 6,
        medium_count: 3,
        high_count: 0,
        last_alarm_time: new Date(now.getTime() - 45 * 60000).toISOString() // 45 min ago
      },
      {
        client_id: 'MTR-004',
        device_name: 'Meter Station Delta',
        total_alarms: 7,
        low_count: 4,
        medium_count: 2,
        high_count: 1,
        last_alarm_time: new Date(now.getTime() - 2 * 3600000).toISOString() // 2 hours ago
      },
      {
        client_id: 'MTR-005',
        device_name: 'Meter Station Epsilon',
        total_alarms: 4,
        low_count: 3,
        medium_count: 1,
        high_count: 0,
        last_alarm_time: new Date(now.getTime() - 5 * 3600000).toISOString() // 5 hours ago
      }
    ];
    topDevices = dummyDevices;
  }

  const getMostSevereAlarm = (device: DeviceAlarmCount) => {
    if (device.high_count > 0) return 'high';
    if (device.medium_count > 0) return 'medium';
    if (device.low_count > 0) return 'low';
    return null;
  };

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Top Alerting Devices</h2>
        <button
          onClick={() => navigate('/alarms')}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View All →
        </button>
      </div>

      {topDevices.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <div className="text-2xl mb-1">✓</div>
          <p className="text-xs">No alarms</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topDevices.map((device, index) => (
            <div
              key={device.client_id}
              className="flex items-center justify-between p-2 bg-gray-800/30 hover:bg-gray-800/50 rounded transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/devices?client_id=${device.client_id}`)}
            >
              {/* Rank Badge - Compact */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                index === 0 ? 'bg-red-500/20 text-red-400' :
                index === 1 ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {index + 1}
              </div>

              {/* Device Info - Compact */}
              <div className="flex-1 ml-2">
                <div className="flex items-center space-x-1">
                  <span className="text-white text-xs font-semibold group-hover:text-blue-400 transition-colors">
                    {device.client_id}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {getTimeSince(device.last_alarm_time)}
                </div>
              </div>

              {/* Alarm Indicator - Compact */}
              <div className="flex items-center space-x-2">
                <AlarmIndicator
                  severity={getMostSevereAlarm(device) as any}
                  lowCount={device.low_count}
                  mediumCount={device.medium_count}
                  highCount={device.high_count}
                  size="sm"
                />
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{device.total_alarms}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {topDevices.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
          <p className="text-sm text-gray-400">
            Showing top {topDevices.length} of {deviceAlarmMap.size} devices with alarms
          </p>
        </div>
      )}
    </div>
  );
};

export default TopAlertingDevices;
