import { useState, useEffect } from 'react';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';

const LiveMonitor = () => {
  const [devices, setDevices] = useState([]);
  const [deviceReadings, setDeviceReadings] = useState({});
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      // Select all devices by default
      setSelectedDevices(devices.map(d => d.id));
    }
  }, [devices]);

  useEffect(() => {
    if (selectedDevices.length > 0) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [selectedDevices]);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    try {
      const readings = {};
      await Promise.all(
        selectedDevices.map(async (deviceId) => {
          try {
            const response = await api.get(`/analytics/device/${deviceId}/recent?limit=1`);
            if (response.data && response.data.length > 0) {
              readings[deviceId] = response.data[0];
            }
          } catch (error) {
            console.error(`Error fetching data for device ${deviceId}:`, error);
          }
        })
      );
      setDeviceReadings(readings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  const toggleDevice = (deviceId) => {
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
    } else {
      setSelectedDevices([...selectedDevices, deviceId]);
    }
  };

  const selectAll = () => {
    setSelectedDevices(devices.map(d => d.id));
  };

  const deselectAll = () => {
    setSelectedDevices([]);
  };

  const getStatusColor = (value, parameter) => {
    // Threshold logic based on measurement parameters
    switch (parameter) {
      case 'temperature':
        // Temperature: -10 to 150°F
        if (value > 100 || value < 20) return 'text-red-400'; // danger
        if (value > 90 || value < 30) return 'text-yellow-400'; // warning
        return 'text-green-400'; // normal (30-90°F)
      case 'static_pressure':
        // Pressure: 0 to 150 PSI
        if (value < 30 || value > 120) return 'text-red-400';
        if (value < 40 || value > 110) return 'text-yellow-400';
        return 'text-green-400'; // normal (40-110 PSI)
      case 'differential_pressure':
        // Differential Pressure: 0 to 500 IWC
        if (value > 300) return 'text-red-400';
        if (value > 250) return 'text-yellow-400';
        return 'text-green-400'; // normal (<250 IWC)
      case 'volume':
        // Volume: 0 to 25000 MCF
        if (value < 3000) return 'text-red-400';
        if (value < 4000) return 'text-yellow-400';
        return 'text-green-400'; // normal (>4000 MCF)
      case 'total_volume_flow':
        // Flow: 0 to 40000 MCF/day
        if (value < 5000) return 'text-red-400';
        if (value < 8000) return 'text-yellow-400';
        return 'text-green-400'; // normal (>8000 MCF/day)
      default:
        return 'text-blue-400';
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.last_seen) return 'offline';
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffSeconds = (now - lastSeen) / 1000;

    if (diffSeconds < 10) return 'online';
    if (diffSeconds < 60) return 'warning';
    return 'offline';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Monitoring</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time device data with 2-second refresh</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last Update: {lastUpdate.toLocaleTimeString()}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>
        </div>

        {/* Device Selection */}
        <div className="glass rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Devices to Monitor</h2>
            <div className="space-x-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 text-sm"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 text-sm"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {devices.map(device => {
              const status = getDeviceStatus(device);
              return (
                <button
                  key={device.id}
                  onClick={() => toggleDevice(device.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedDevices.includes(device.id)
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'online' ? 'bg-green-500 animate-pulse' :
                      status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    {selectedDevices.includes(device.id) && (
                      <div className="text-blue-400">✓</div>
                    )}
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{device.device_name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{device.client_id}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Data Grid */}
        {selectedDevices.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices Selected</h3>
            <p className="text-gray-600 dark:text-gray-400">Select devices above to start monitoring live data</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedDevices.map(deviceId => {
              const device = devices.find(d => d.id === deviceId);
              const reading = deviceReadings[deviceId];
              const status = getDeviceStatus(device);

              return (
                <div key={deviceId} className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        status === 'online' ? 'bg-green-500 animate-pulse' :
                        status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{device.device_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{device.client_id} • {device.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Last Reading</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {reading ? new Date(reading.timestamp).toLocaleTimeString() : 'No data'}
                      </p>
                    </div>
                  </div>

                  {reading ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border-l-4 border-orange-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Temperature</span>
                          <span className="text-2xl">🌡️</span>
                        </div>
                        <p className={`text-3xl font-bold ${getStatusColor(reading.temperature, 'temperature')}`}>
                          {reading.temperature?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">°F</p>
                        <p className="text-xs text-gray-600 mt-1">Range: -10 to 150°F</p>
                      </div>

                      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Static Pressure</span>
                          <span className="text-2xl">📊</span>
                        </div>
                        <p className={`text-3xl font-bold ${getStatusColor(reading.static_pressure, 'static_pressure')}`}>
                          {reading.static_pressure?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">PSI</p>
                        <p className="text-xs text-gray-600 mt-1">Range: 0 to 150 PSI</p>
                      </div>

                      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Diff. Pressure</span>
                          <span className="text-2xl">⚡</span>
                        </div>
                        <p className={`text-3xl font-bold ${getStatusColor(reading.differential_pressure, 'differential_pressure')}`}>
                          {reading.differential_pressure?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">IWC</p>
                        <p className="text-xs text-gray-600 mt-1">Range: 0 to 500 IWC</p>
                      </div>

                      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Volume</span>
                          <span className="text-2xl">📦</span>
                        </div>
                        <p className={`text-3xl font-bold ${getStatusColor(reading.volume, 'volume')}`}>
                          {reading.volume?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">MCF</p>
                        <p className="text-xs text-gray-600 mt-1">Range: 0 to 25000 MCF</p>
                      </div>

                      <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg border-l-4 border-cyan-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Flow</span>
                          <span className="text-2xl">💧</span>
                        </div>
                        <p className={`text-3xl font-bold ${getStatusColor(reading.total_volume_flow, 'total_volume_flow')}`}>
                          {reading.total_volume_flow?.toFixed(1) || '0.0'}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">MCF/day</p>
                        <p className="text-xs text-gray-600 mt-1">Range: 0 to 40000 MCF/day</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      <p>No recent data available for this device</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Summary */}
        {selectedDevices.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Monitoring Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Devices Monitored</p>
                <p className="text-3xl font-bold text-blue-400">{selectedDevices.length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Active Readings</p>
                <p className="text-3xl font-bold text-green-400">{Object.keys(deviceReadings).length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Update Interval</p>
                <p className="text-3xl font-bold text-purple-400">2s</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Data Quality</p>
                <p className="text-3xl font-bold text-green-400">
                  {selectedDevices.length > 0
                    ? Math.round((Object.keys(deviceReadings).length / selectedDevices.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveMonitor;
