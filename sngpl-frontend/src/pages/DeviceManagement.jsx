import { useState, useEffect } from 'react';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import SectionCards from '../components/SectionCards';

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_name: '',
    latitude: '',
    longitude: ''
  });

  const sections = [
    { id: 'ALL', name: 'All Sections', color: 'blue' },
    { id: 'I', name: 'Section I - Multan/BWP/Sahiwal', color: 'green' },
    { id: 'II', name: 'Section II - Faisalabad/Sargodha', color: 'purple' },
    { id: 'III', name: 'Section III - Islamabad/Rawalpindi', color: 'orange' },
    { id: 'IV', name: 'Section IV - Lahore/Gujranwala', color: 'pink' },
    { id: 'V', name: 'Section V - Peshawar/Mardan', color: 'teal' },
  ];

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
      setLoading(false);
    }
  };

  // Extract section from client_id (e.g., "SMS-I-002" -> "I")
  const extractSection = (clientId) => {
    if (!clientId) return null;
    const match = clientId.match(/SMS-([IVX]+)-/);
    return match ? match[1] : null;
  };

  // Group devices by section
  const groupedDevices = () => {
    const groups = {
      'I': [],
      'II': [],
      'III': [],
      'IV': [],
      'V': []
    };

    devices.forEach(device => {
      const section = extractSection(device.client_id);
      if (section && groups[section]) {
        groups[section].push(device);
      }
    });

    return groups;
  };

  // Get devices for selected section
  const getDevicesForSection = () => {
    if (selectedSection === 'ALL') {
      return devices;
    }
    const groups = groupedDevices();
    return groups[selectedSection] || [];
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

  const handleEditDevice = async (e) => {
    e.preventDefault();
    try {
      // API requires all fields for PUT request
      await api.put(`/devices/${currentDevice.client_id}`, {
        client_id: currentDevice.client_id,
        device_name: formData.device_name,
        device_type: currentDevice.device_type || 'EVC',
        location: currentDevice.location || 'Unknown',
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0
      });
      toast.success('Device updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchDevices();
    } catch (error) {
      const errorMsg = typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : 'Failed to update device';
      toast.error(errorMsg);
    }
  };

  const openEditModal = (device) => {
    setCurrentDevice(device);
    setFormData({
      device_name: device.device_name,
      latitude: device.latitude || '',
      longitude: device.longitude || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      device_name: '',
      latitude: '',
      longitude: ''
    });
    setCurrentDevice(null);
  };

  const handleInlineEdit = (device) => {
    setEditingDevice(device.id);
  };

  const handleInlineSave = async (device) => {
    try {
      // Validate required fields
      if (!device.device_name || !device.device_name.trim()) {
        toast.error('Device name is required');
        return;
      }

      if (!device.location || !device.location.trim()) {
        toast.error('Location is required');
        return;
      }

      const lat = parseFloat(device.latitude);
      const lng = parseFloat(device.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        toast.error('Valid latitude and longitude are required');
        return;
      }

      if (lat < -90 || lat > 90) {
        toast.error('Latitude must be between -90 and 90');
        return;
      }

      if (lng < -180 || lng > 180) {
        toast.error('Longitude must be between -180 and 180');
        return;
      }

      // Ensure device_type is valid (EVC or FC only)
      let deviceType = device.device_type;
      if (!deviceType || (deviceType !== 'EVC' && deviceType !== 'FC')) {
        deviceType = 'EVC'; // Default to EVC if invalid
      }

      // API requires all fields for PUT request
      await api.put(`/devices/${device.client_id}`, {
        client_id: device.client_id,
        device_name: device.device_name.trim(),
        device_type: deviceType,
        location: device.location.trim(),
        latitude: lat,
        longitude: lng
      });
      toast.success('Device updated successfully!');
      setEditingDevice(null);
      fetchDevices();
    } catch (error) {
      // Handle validation errors from API
      let errorMsg = 'Failed to update device';

      if (error.response?.data) {
        const data = error.response.data;

        // Handle Pydantic validation errors
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(err => err.msg || err.message || 'Validation error').join(', ');
        } else if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (data.message) {
          errorMsg = data.message;
        }
      }

      toast.error(errorMsg);
      console.error('Update error:', error.response?.data || error);

      // Cancel editing and reload fresh data
      setEditingDevice(null);
      fetchDevices();
    }
  };

  const handleInlineCancel = () => {
    setEditingDevice(null);
    fetchDevices();
  };

  const handleDeviceChange = (deviceId, field, value) => {
    setDevices(devices.map(d =>
      d.id === deviceId ? { ...d, [field]: value } : d
    ));
  };

  const stats = {
    total: devices.length,
    online: devices.filter(d => getDeviceStatus(d) === 'online').length,
    warning: devices.filter(d => getDeviceStatus(d) === 'warning').length,
    offline: devices.filter(d => getDeviceStatus(d) === 'offline').length,
  };

  const sectionStats = () => {
    const groups = groupedDevices();
    return Object.keys(groups).map(sectionId => ({
      id: sectionId,
      name: sections.find(s => s.id === sectionId)?.name || `Section ${sectionId}`,
      count: groups[sectionId].length,
      online: groups[sectionId].filter(d => getDeviceStatus(d) === 'online').length
    }));
  };

  const filteredDevices = getDevicesForSection();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Device Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage device names and GPS coordinates by section</p>
          </div>
        </div>

        {/* Section Overview Cards */}
        <SectionCards />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Devices</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="text-4xl">📡</div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{stats.online}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Warning</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.warning}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-500"></div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Offline</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.offline}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500"></div>
            </div>
          </div>
        </div>

        {/* Section Filter */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter by Section</h2>
          <div className="flex flex-wrap gap-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
                  selectedSection === section.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {section.name}
                {section.id !== 'ALL' && (
                  <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs">
                    {groupedDevices()[section.id]?.length || 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section Statistics Cards */}
        {selectedSection === 'ALL' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {sectionStats().map((stat) => (
              <div key={stat.id} className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Section {stat.id}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span className="text-green-400">{stat.online}</span> online
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSection(stat.id)}
                    className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded text-xs hover:bg-blue-600/30 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Devices Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedSection === 'ALL' ? 'All Devices' : sections.find(s => s.id === selectedSection)?.name}
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">({filteredDevices.length} devices)</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              <div className="text-4xl mb-4">⏳</div>
              <p>Loading devices...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📡</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No devices in this section</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Client ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Device Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Latitude</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Longitude</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredDevices.map((device) => {
                    const status = getDeviceStatus(device);
                    const isEditing = editingDevice === device.id;

                    return (
                      <tr
                        key={device.id}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'online' ? 'bg-green-500 animate-pulse' :
                              status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-mono text-sm text-gray-300">{device.client_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={device.device_name}
                              onChange={(e) => handleDeviceChange(device.id, 'device_name', e.target.value)}
                              className="w-full px-3 py-1 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <span className="text-gray-900 dark:text-white font-medium">{device.device_name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300 text-sm">{device.location || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={device.latitude || ''}
                              onChange={(e) => handleDeviceChange(device.id, 'latitude', e.target.value)}
                              className="w-full px-3 py-1 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                              placeholder="e.g., 30.1575"
                            />
                          ) : (
                            <span className="text-gray-300 text-sm font-mono">
                              {device.latitude ? device.latitude.toFixed(4) : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={device.longitude || ''}
                              onChange={(e) => handleDeviceChange(device.id, 'longitude', e.target.value)}
                              className="w-full px-3 py-1 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                              placeholder="e.g., 71.5249"
                            />
                          ) : (
                            <span className="text-gray-300 text-sm font-mono">
                              {device.longitude ? device.longitude.toFixed(4) : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            status === 'online' ? 'bg-green-500/20 text-green-400' :
                            status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleInlineSave(device)}
                                className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-all duration-200 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleInlineCancel}
                                className="px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded transition-all duration-200 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleInlineEdit(device)}
                              className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-all duration-200 text-sm"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Device Modal (kept for reference but inline editing is primary) */}
      {showEditModal && currentDevice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Device</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentDevice.client_id}</p>
              </div>
              <button
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditDevice} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device Name</label>
                <input
                  type="text"
                  value={formData.device_name}
                  onChange={(e) => setFormData({...formData, device_name: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 30.1575"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 71.5249"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DeviceManagement;
