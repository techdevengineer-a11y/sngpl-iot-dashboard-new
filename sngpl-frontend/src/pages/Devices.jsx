import { useState, useEffect } from 'react';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [devicesWithReadings, setDevicesWithReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    limit: 100,
    quickFilter: '7days'
  });
  const [newDevice, setNewDevice] = useState({
    client_id: '',
    device_name: '',
    device_type: 'EVC',
    location: '',
    latitude: 0,
    longitude: 0
  });

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      console.log('Fetched devices:', data);
      setDevices(data);

      // Fetch latest readings for each device
      const devicesWithData = await Promise.all(
        data.map(async (device) => {
          try {
            const response = await api.get(`/analytics/device/${device.id}/recent?limit=1`);
            const latestReading = response.data && response.data.length > 0 ? response.data[0] : null;
            return {
              ...device,
              latestReading
            };
          } catch (error) {
            return {
              ...device,
              latestReading: null
            };
          }
        })
      );

      // Sort devices: active devices first, then by client_id
      const sortedDevices = devicesWithData.sort((a, b) => {
        // First sort by active status (active first)
        if (a.is_active !== b.is_active) {
          return b.is_active ? 1 : -1;
        }
        // Then sort by client_id
        return (a.client_id || '').localeCompare(b.client_id || '');
      });

      setDevicesWithReadings(sortedDevices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
      setLoading(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/devices/', newDevice);
      toast.success('Device added successfully!');
      setShowAddModal(false);
      setNewDevice({
        client_id: '',
        device_name: '',
        location: '',
        latitude: 0,
        longitude: 0
      });
      fetchDevices();
    } catch (error) {
      toast.error('Failed to add device');
      console.error('Error adding device:', error);
    }
  };

  const handleDeleteDevice = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;

    try {
      await api.delete(`/devices/${clientId}`);
      toast.success('Device deleted successfully!');
      fetchDevices();
    } catch (error) {
      toast.error('Failed to delete device');
      console.error('Error deleting device:', error);
    }
  };

  const handleViewHistory = (device) => {
    setSelectedDevice(device);
    setShowHistoryModal(true);
    // Set default date range to last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    setHistoryFilters({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 100,
      quickFilter: '7days'
    });
    fetchHistory(device.client_id, {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 100
    });
  };

  const handleQuickFilter = (filterType) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (filterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '3days':
        startDate.setDate(startDate.getDate() - 3);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'all':
        startDate = null;
        break;
      default:
        return; // custom - don't change dates
    }

    const newFilters = {
      ...historyFilters,
      startDate: startDate ? startDate.toISOString().split('T')[0] : '',
      endDate: endDate.toISOString().split('T')[0],
      quickFilter: filterType
    };

    setHistoryFilters(newFilters);
    if (selectedDevice) {
      fetchHistory(selectedDevice.client_id, newFilters);
    }
  };

  const fetchHistory = async (clientId, filters) => {
    setHistoryLoading(true);
    setHistoryData([]); // Clear previous data
    try {
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      if (filters.startDate) params.append('start_date', filters.startDate + 'T00:00:00');
      if (filters.endDate) params.append('end_date', filters.endDate + 'T23:59:59');
      params.append('page_size', filters.limit || 100);
      params.append('page', 1);

      console.log('Fetching history with params:', params.toString());
      const response = await api.get(`/analytics/readings?${params.toString()}`);
      console.log('History response:', response.data);

      // Handle paginated response
      const data = response.data.data || response.data;
      setHistoryData(Array.isArray(data) ? data : []);

      if (data.length === 0) {
        toast('No data found for the selected time range', {
          icon: 'ℹ️',
        });
      }
    } catch (error) {
      toast.error('Failed to load history data');
      console.error('Error fetching history:', error);
      console.error('Error response:', error.response?.data);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearchHistory = () => {
    if (selectedDevice) {
      fetchHistory(selectedDevice.client_id, historyFilters);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDevice) params.append('device_id', selectedDevice.id);
      if (historyFilters.startDate) params.append('start_date', historyFilters.startDate);
      if (historyFilters.endDate) params.append('end_date', historyFilters.endDate);

      const response = await api.get(`/analytics/readings/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `device_${selectedDevice.client_id}_history.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported successfully!');
    } catch (error) {
      toast.error('Failed to export CSV');
      console.error('Error exporting CSV:', error);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.last_seen) return 'offline';
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  };

  const getBatteryColor = (voltage) => {
    if (!voltage || voltage === 0) return 'text-gray-500';
    // 4-color battery threshold system
    if (voltage < 10) return 'text-red-600';        // Red: Very Low (< 10V)
    if (voltage < 10.5) return 'text-red-400';      // Light Red: Low (10-10.5V)
    if (voltage <= 14) return 'text-green-400';     // Green: Normal (10.5-14V)
    return 'text-yellow-400';                       // Yellow: High (> 14V)
  };

  const getStatusBadge = (status) => {
    const badges = {
      online: { color: 'bg-green-500', text: 'Online', icon: '✓' },
      warning: { color: 'bg-yellow-500', text: 'Warning', icon: '⚠' },
      offline: { color: 'bg-red-500', text: 'Offline', icon: '✕' }
    };
    const badge = badges[status] || badges.offline;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}/20 text-white`}>
        <span>{badge.icon}</span>
        <span>{badge.text}</span>
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Devices</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time device monitoring and parameters</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95"
          >
            <span className="text-xl">➕</span>
            <span>Add Device</span>
          </button>
        </div>

        {loading ? (
          <div className="glass rounded-xl p-12 text-center animate-fade-in">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <div className="text-gray-600 dark:text-gray-400 animate-pulse">Loading devices...</div>
            </div>
          </div>
        ) : devicesWithReadings.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center animate-fade-in">
            <div className="text-6xl mb-4 animate-bounce">📡</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Devices will appear here once they start sending data via MQTT
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
            >
              Add Your First Device
            </button>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Device Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Client ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Temperature (°F)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Static Pressure (PSI)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Diff. Pressure (IWC)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Battery (V)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Volume (MCF)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Total volume flow (MCF/DAY)</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Last Seen</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {devicesWithReadings.map((device, index) => {
                    const status = getDeviceStatus(device);
                    const reading = device.latestReading;
                    return (
                      <tr
                        key={device.id}
                        className="hover:bg-gray-800/30 transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <td className="px-6 py-4">
                          {getStatusBadge(status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'online' ? 'bg-green-500 animate-pulse' :
                              status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-gray-900 dark:text-white font-medium">{device.device_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-300">{device.client_id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-900 dark:text-white">{device.location}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${reading ? 'text-blue-400' : 'text-gray-500'}`}>
                            {reading ? reading.temperature.toFixed(2) : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${reading ? 'text-green-400' : 'text-gray-500'}`}>
                            {reading ? reading.static_pressure.toFixed(2) : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${reading ? 'text-yellow-400' : 'text-gray-500'}`}>
                            {reading ? reading.differential_pressure.toFixed(2) : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${getBatteryColor(reading?.battery)}`}>
                            {reading?.battery ? `${reading.battery.toFixed(2)}V` : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${reading ? 'text-purple-400' : 'text-gray-500'}`}>
                            {reading ? reading.volume.toFixed(2) : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-lg font-semibold ${reading ? 'text-pink-400' : 'text-gray-500'}`}>
                            {reading ? reading.total_volume_flow.toFixed(2) : '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600 dark:text-gray-400 text-sm">
                            {device.last_seen
                              ? new Date(device.last_seen).toLocaleString()
                              : 'Never'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewHistory(device)}
                              className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-all duration-200 text-sm hover:scale-105 active:scale-95"
                            >
                              History
                            </button>
                            <button
                              onClick={() => handleDeleteDevice(device.client_id)}
                              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-all duration-200 text-sm hover:scale-105 active:scale-95"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 animate-scale-in">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Device</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device ID</label>
                <input
                  type="text"
                  value={newDevice.client_id}
                  onChange={(e) => setNewDevice({...newDevice, client_id: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., modem2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device Name</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({...newDevice, device_name: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Compressor Station 2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device Type</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="EVC">EVC (Electronic Volume Corrector)</option>
                  <option value="FC">FC (Flow Computer)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Lahore, Pakistan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newDevice.latitude}
                    onChange={(e) => setNewDevice({...newDevice, latitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newDevice.longitude}
                    onChange={(e) => setNewDevice({...newDevice, longitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data History Modal */}
      {showHistoryModal && selectedDevice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-6xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data History</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedDevice.device_name} ({selectedDevice.client_id})
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Search Filters */}
            <div className="glass rounded-lg p-4 mb-6">
              {/* Quick Filter Buttons */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Quick Filters</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickFilter('today')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === 'today'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleQuickFilter('1day')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === '1day'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    1 Day
                  </button>
                  <button
                    onClick={() => handleQuickFilter('3days')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === '3days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    3 Days
                  </button>
                  <button
                    onClick={() => handleQuickFilter('7days')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === '7days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => handleQuickFilter('all')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All Data
                  </button>
                  <button
                    onClick={() => handleQuickFilter('custom')}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                      historyFilters.quickFilter === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => {
                      setHistoryFilters({...historyFilters, startDate: e.target.value, quickFilter: 'custom'});
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => {
                      setHistoryFilters({...historyFilters, endDate: e.target.value, quickFilter: 'custom'});
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Limit</label>
                  <select
                    value={historyFilters.limit}
                    onChange={(e) => setHistoryFilters({...historyFilters, limit: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value={50}>50 records</option>
                    <option value={100}>100 records</option>
                    <option value={500}>500 records</option>
                    <option value={1000}>1000 records</option>
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleSearchHistory}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95"
                  >
                    🔍 Search
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 active:scale-95"
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* History Data Table */}
            {historyLoading ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 animate-pulse">Loading history data...</div>
                </div>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Found</h3>
                <p className="text-gray-600 dark:text-gray-400">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Timestamp</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Temp (°C)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Static P. (bar)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Diff P. (bar)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Volume (m³)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">Flow (m³/h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {historyData.map((reading, index) => (
                      <tr key={reading.id || index} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(reading.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-400 font-semibold">
                          {reading.temperature?.toFixed(2) || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-400 font-semibold">
                          {reading.static_pressure?.toFixed(2) || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-yellow-400 font-semibold">
                          {reading.differential_pressure?.toFixed(2) || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-400 font-semibold">
                          {reading.volume?.toFixed(2) || '--'}
                        </td>
                        <td className="px-4 py-3 text-sm text-pink-400 font-semibold">
                          {reading.total_volume_flow?.toFixed(2) || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                  Showing {historyData.length} records
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Devices;
