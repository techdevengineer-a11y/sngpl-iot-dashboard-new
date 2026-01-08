import { useState, useEffect } from 'react';
import api from '../services/api';

const SiteOverview = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteData();
    const interval = setInterval(fetchSiteData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSiteData = async () => {
    try {
      const response = await api.get('/dashboard/status-overview');
      setSites(response.data.devices || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching site data:', error);
      setLoading(false);
    }
  };

  const getOverallStatus = (device) => {
    if (!device.parameters) return 'Unknown';

    const params = Object.values(device.parameters);
    const hasCritical = params.some(p => p.status?.severity === 'high');
    const hasMedium = params.some(p => p.status?.severity === 'medium');
    const hasLow = params.some(p => p.status?.severity === 'low');

    if (device.online_status?.status === 'Offline') return 'Offline';
    if (hasCritical || device.active_alarms > 2) return 'Critical';
    if (hasMedium || device.active_alarms > 0) return 'Warning';
    if (hasLow) return 'Caution';
    return 'Normal';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Normal': 'bg-green-500',
      'Caution': 'bg-yellow-500',
      'Warning': 'bg-orange-500',
      'Critical': 'bg-red-500',
      'Offline': 'bg-gray-500',
      'Unknown': 'bg-gray-600'
    };
    return colors[status] || colors['Unknown'];
  };

  const getStatusTextColor = (status) => {
    const colors = {
      'Normal': 'text-green-400',
      'Caution': 'text-yellow-400',
      'Warning': 'text-orange-400',
      'Critical': 'text-red-400',
      'Offline': 'text-gray-400',
      'Unknown': 'text-gray-500'
    };
    return colors[status] || colors['Unknown'];
  };

  const getStatusBgColor = (status) => {
    const colors = {
      'Normal': 'bg-green-500/10 border-green-500/30',
      'Caution': 'bg-yellow-500/10 border-yellow-500/30',
      'Warning': 'bg-orange-500/10 border-orange-500/30',
      'Critical': 'bg-red-500/10 border-red-500/30',
      'Offline': 'bg-gray-500/10 border-gray-500/30',
      'Unknown': 'bg-gray-600/10 border-gray-600/30'
    };
    return colors[status] || colors['Unknown'];
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Normal': '✓',
      'Caution': '⚠',
      'Warning': '⚠',
      'Critical': '✕',
      'Offline': '○',
      'Unknown': '?'
    };
    return icons[status] || icons['Unknown'];
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading site overview...</div>
        </div>
      </div>
    );
  }

  // Group by device type
  const evcDevices = sites.filter(d => d.device_type === 'EVC');
  const fcDevices = sites.filter(d => d.device_type === 'FC');

  return (
    <div className="space-y-6">
      {/* EVC Sites */}
      {evcDevices.length > 0 && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">EVC Sites Overview</h2>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
              {evcDevices.length} Sites
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {evcDevices.map((device) => {
              const status = getOverallStatus(device);
              return (
                <div
                  key={device.id}
                  className={`border rounded-lg p-4 hover:scale-105 transition-all duration-200 cursor-pointer ${getStatusBgColor(status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm truncate" title={device.device_name}>
                        {device.device_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{device.client_id}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full ${getStatusColor(status)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ml-2`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-medium ${getStatusTextColor(status)}`}>{status}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white text-right truncate ml-2" title={device.location}>
                        {device.location?.substring(0, 20)}{device.location?.length > 20 ? '...' : ''}
                      </span>
                    </div>

                    {device.active_alarms > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Alarms:</span>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-medium">
                          {device.active_alarms}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Last Seen:</span>
                        <span className="text-gray-400 text-right">
                          {device.last_seen
                            ? new Date(device.last_seen).toLocaleTimeString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FC Sites */}
      {fcDevices.length > 0 && (
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">FC Sites Overview</h2>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              {fcDevices.length} Sites
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fcDevices.map((device) => {
              const status = getOverallStatus(device);
              return (
                <div
                  key={device.id}
                  className={`border rounded-lg p-4 hover:scale-105 transition-all duration-200 cursor-pointer ${getStatusBgColor(status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm truncate" title={device.device_name}>
                        {device.device_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{device.client_id}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-full ${getStatusColor(status)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ml-2`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-medium ${getStatusTextColor(status)}`}>{status}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white text-right truncate ml-2" title={device.location}>
                        {device.location?.substring(0, 20)}{device.location?.length > 20 ? '...' : ''}
                      </span>
                    </div>

                    {device.active_alarms > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Alarms:</span>
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded font-medium">
                          {device.active_alarms}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Last Seen:</span>
                        <span className="text-gray-400 text-right">
                          {device.last_seen
                            ? new Date(device.last_seen).toLocaleTimeString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-400">Caution</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-gray-400">Warning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-gray-400">Critical</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span className="text-gray-400">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteOverview;
