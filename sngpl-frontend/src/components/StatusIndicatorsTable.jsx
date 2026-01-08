import { useState, useEffect } from 'react';
import api from '../services/api';

const StatusIndicatorsTable = ({ deviceType = null }) => {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatusData();
    const interval = setInterval(fetchStatusData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [deviceType]);

  const fetchStatusData = async () => {
    try {
      const params = deviceType ? `?device_type=${deviceType}` : '';
      const response = await api.get(`/dashboard/status-overview${params}`);
      const devices = response.data.devices || [];

      // Sort devices: active (online) devices first, then by client_id
      const sortedDevices = devices.sort((a, b) => {
        // First sort by online status (online first)
        const aOnline = a.online_status?.status === 'Online';
        const bOnline = b.online_status?.status === 'Online';
        if (aOnline !== bOnline) {
          return bOnline ? 1 : -1;
        }
        // Then sort by client_id
        return (a.client_id || '').localeCompare(b.client_id || '');
      });

      setStatusData(sortedDevices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status data:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Normal': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
      'Warning': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500' },
      'High': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
      'Low': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
      'Critical': { bg: 'bg-red-600/20', text: 'text-red-500', border: 'border-red-600' },
      'HighPressure': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
      'LowPressure': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
      'Unknown': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' }
    };

    const config = statusConfig[status?.status] || statusConfig['Unknown'];

    return (
      <div className={`px-2 py-1 rounded border ${config.bg} ${config.border} ${config.text} text-xs font-medium text-center`}>
        {status?.status || 'Unknown'}
      </div>
    );
  };

  const getOnlineBadge = (onlineStatus) => {
    const statusConfig = {
      'Online': { icon: '🟢', bg: 'bg-green-500/20', text: 'text-green-400' },
      'Warning': { icon: '🟡', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      'Offline': { icon: '🔴', bg: 'bg-red-500/20', text: 'text-red-400' }
    };

    const config = statusConfig[onlineStatus?.status] || statusConfig['Offline'];

    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        <span className="text-sm font-medium">{onlineStatus?.status || 'Unknown'}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading status indicators...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">
          {deviceType ? `${deviceType} Status Indicators` : 'Device Status Indicators'}
        </h2>
        <span className="text-sm text-gray-400">{statusData.length} devices</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Device</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Temp</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Static P.</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Diff P.</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Volume (MCF)</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Flow (MCF/day)</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Alarms</th>
            </tr>
          </thead>
          <tbody>
            {statusData.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-400">
                  No devices found
                </td>
              </tr>
            ) : (
              statusData.map((device) => (
                <tr key={device.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-white font-medium">{device.device_name}</div>
                      <div className="text-xs text-gray-500">{device.client_id}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      device.device_type === 'EVC'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {device.device_type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {getOnlineBadge(device.online_status)}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(device.parameters?.temperature?.status)}
                    {device.parameters?.temperature?.value !== null && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {device.parameters.temperature.value.toFixed(1)}°C
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(device.parameters?.static_pressure?.status)}
                    {device.parameters?.static_pressure?.value !== null && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {device.parameters.static_pressure.value.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(device.parameters?.differential_pressure?.status)}
                    {device.parameters?.differential_pressure?.value !== null && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {device.parameters.differential_pressure.value.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(device.parameters?.volume?.status)}
                    {device.parameters?.volume?.value !== null && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {device.parameters.volume.value.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(device.parameters?.total_volume_flow?.status)}
                    {device.parameters?.total_volume_flow?.value !== null && (
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {device.parameters.total_volume_flow.value.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {device.active_alarms > 0 ? (
                      <div className="flex items-center justify-center">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-medium">
                          {device.active_alarms}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {statusData.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Warning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>High/Low</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Critical</span>
            </div>
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusIndicatorsTable;
