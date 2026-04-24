import { useState, useEffect } from 'react';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { Radio, Wifi, WifiOff, AlertTriangle, MapPin, Gauge, Edit3, Save, X, Search, Filter } from 'lucide-react';

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceMeters, setDeviceMeters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    device_name: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('device_meters');
      if (saved) setDeviceMeters(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading device meters:', e);
    }
  }, []);

  const saveMeterInfo = (clientId, field, value) => {
    setDeviceMeters(prev => {
      const updated = {
        ...prev,
        [clientId]: { ...(prev[clientId] || { meter_type: '', units: '' }), [field]: value }
      };
      localStorage.setItem('device_meters', JSON.stringify(updated));
      return updated;
    });
  };

  const sections = [
    { id: 'ALL', name: 'All Sections', shortName: 'All', gradient: 'from-blue-500 to-cyan-500', ring: 'ring-blue-500/30' },
    { id: 'I', name: 'Section I - Multan/BWP/Sahiwal', shortName: 'Section I', gradient: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-500/30' },
    { id: 'II', name: 'Section II - Faisalabad/Sargodha', shortName: 'Section II', gradient: 'from-purple-500 to-fuchsia-500', ring: 'ring-purple-500/30' },
    { id: 'III', name: 'Section III - Islamabad/Rawalpindi', shortName: 'Section III', gradient: 'from-orange-500 to-amber-500', ring: 'ring-orange-500/30' },
    { id: 'IV', name: 'Section IV - Lahore/Gujranwala', shortName: 'Section IV', gradient: 'from-pink-500 to-rose-500', ring: 'ring-pink-500/30' },
    { id: 'V', name: 'Section V - Peshawar/Mardan', shortName: 'Section V', gradient: 'from-cyan-500 to-sky-500', ring: 'ring-cyan-500/30' },
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

  // Get devices for selected section (with search filter)
  const getDevicesForSection = () => {
    let list = selectedSection === 'ALL' ? devices : (groupedDevices()[selectedSection] || []);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        (d.client_id || '').toLowerCase().includes(q) ||
        (d.device_name || '').toLowerCase().includes(q) ||
        (d.location || '').toLowerCase().includes(q)
      );
    }
    return list;
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
        {/* Header with gradient */}
        <div className="rounded-2xl p-8 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 shadow-xl shadow-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Radio className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Device Management</h1>
              <p className="text-blue-100 mt-1">Edit device names, meter types, units and GPS coordinates</p>
            </div>
          </div>
        </div>

        {/* Statistics — vibrant gradient cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs uppercase tracking-wide font-semibold">Total Devices</p>
                <p className="text-4xl font-bold mt-2">{stats.total}</p>
              </div>
              <Radio className="w-10 h-10 text-white/40" />
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-green-500/20 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs uppercase tracking-wide font-semibold">Online</p>
                <p className="text-4xl font-bold mt-2">{stats.online}</p>
              </div>
              <Wifi className="w-10 h-10 text-white/40" />
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs uppercase tracking-wide font-semibold">Warning</p>
                <p className="text-4xl font-bold mt-2">{stats.warning}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-white/40" />
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs uppercase tracking-wide font-semibold">Offline</p>
                <p className="text-4xl font-bold mt-2">{stats.offline}</p>
              </div>
              <WifiOff className="w-10 h-10 text-white/40" />
            </div>
          </div>
        </div>

        {/* Section Filter — gradient chips */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter by Section</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {sections.map((section) => {
              const isActive = selectedSection === section.id;
              const count = section.id === 'ALL' ? devices.length : (groupedDevices()[section.id]?.length || 0);
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`px-5 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${
                    isActive
                      ? `bg-gradient-to-r ${section.gradient} text-white shadow-lg ring-2 ${section.ring} scale-105`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{section.shortName}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/25' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Statistics Cards — color coded per section */}
        {selectedSection === 'ALL' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {sectionStats().map((stat) => {
              const sec = sections.find(s => s.id === stat.id);
              return (
                <button
                  key={stat.id}
                  onClick={() => setSelectedSection(stat.id)}
                  className={`rounded-2xl p-5 text-left bg-gradient-to-br ${sec?.gradient} shadow-lg hover:scale-105 transition-transform text-white`}
                >
                  <h3 className="text-xs uppercase tracking-wider font-bold opacity-90">Section {stat.id}</h3>
                  <p className="text-3xl font-bold mt-2">{stat.count}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <span>{stat.online} online</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Search + Table */}
        <div className="glass rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedSection === 'ALL' ? 'All Devices' : sections.find(s => s.id === selectedSection)?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Showing {filteredDevices.length} {filteredDevices.length === 1 ? 'device' : 'devices'}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Loading devices...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Radio className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Devices Found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try changing the section filter or search query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Client ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Device Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />Meter Type</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Units</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Location</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Latitude</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Longitude</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredDevices.map((device, idx) => {
                    const status = getDeviceStatus(device);
                    const isEditing = editingDevice === device.id;
                    const rowBg = isEditing
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : idx % 2 === 0 ? 'bg-white dark:bg-gray-900/30' : 'bg-gray-50/50 dark:bg-gray-800/30';

                    return (
                      <tr
                        key={device.id}
                        className={`${rowBg} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              status === 'online' ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' :
                              status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{device.client_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={device.device_name}
                              onChange={(e) => handleDeviceChange(device.id, 'device_name', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                            />
                          ) : (
                            <span className="text-gray-900 dark:text-white font-medium">{device.device_name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={deviceMeters[device.client_id]?.meter_type || ''}
                              onChange={(e) => saveMeterInfo(device.client_id, 'meter_type', e.target.value)}
                              placeholder="e.g., Daniel 3410"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                            />
                          ) : deviceMeters[device.client_id]?.meter_type ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              {deviceMeters[device.client_id].meter_type}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={deviceMeters[device.client_id]?.units || ''}
                              onChange={(e) => saveMeterInfo(device.client_id, 'units', e.target.value)}
                              placeholder="e.g., MCF"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                            />
                          ) : deviceMeters[device.client_id]?.units ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                              {deviceMeters[device.client_id].units}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{device.location || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={device.latitude || ''}
                              onChange={(e) => handleDeviceChange(device.id, 'latitude', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                              placeholder="e.g., 30.1575"
                            />
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
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
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border-2 border-blue-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                              placeholder="e.g., 71.5249"
                            />
                          ) : (
                            <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                              {device.longitude ? device.longitude.toFixed(4) : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            status === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {status === 'online' ? <Wifi className="w-3 h-3" /> : status === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleInlineSave(device)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md shadow-green-500/30 transition-all"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={handleInlineCancel}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold text-sm transition-all"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleInlineEdit(device)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm shadow-md shadow-blue-500/30 transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
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
