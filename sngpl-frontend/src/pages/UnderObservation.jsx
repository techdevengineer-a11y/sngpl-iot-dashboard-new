import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, TrendingUp, MapPin, Activity, Trash2, Thermometer, Gauge, Wind, Droplets, Battery, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SectionCards from '../components/SectionCards';

const UnderObservation = () => {
  const [devices, setDevices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchObservedDevices();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchObservedDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchObservedDevices = () => {
    // Load devices from localStorage
    const saved = localStorage.getItem('observed_devices');
    if (saved) {
      try {
        setDevices(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading observed devices:', e);
        setDevices([]);
      }
    }
  };

  const removeDevice = (deviceId, event) => {
    event.stopPropagation(); // Prevent row click
    const updated = devices.filter(d => d.id !== deviceId);
    setDevices(updated);
    localStorage.setItem('observed_devices', JSON.stringify(updated));
  };

  const viewDevice = (sectionId, deviceId) => {
    navigate(`/stations/${deviceId}`);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getBatteryColor = (level) => {
    if (!level) return 'text-gray-500';
    if (level >= 12.5) return 'text-green-600';
    if (level >= 11.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Eye className="w-8 h-8 text-blue-600" />
                Under Observation
              </h1>
              <p className="text-gray-600 mt-2">
                Devices you're monitoring closely - {devices.length} device{devices.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => navigate('/sections')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse Sections
            </button>
          </div>
        </div>

        {/* Section Overview Cards */}
        <SectionCards />

        {/* Statistics Cards */}
        {devices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Online Devices</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => d.is_active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Offline Devices</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => !d.is_active).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Observed</p>
                  <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Devices Table */}
        {devices.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Devices Under Observation
            </h3>
            <p className="text-gray-600 mb-6">
              Add devices from the Sections page to monitor them here for quick access
            </p>
            <button
              onClick={() => navigate('/sections')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse Sections
            </button>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-3 h-3" />
                        Temp (°F)
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3" />
                        Static P (PSI)
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Wind className="w-3 h-3" />
                        Diff P (IWC)
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        Battery
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {devices.map((device, index) => (
                    <tr
                      key={device.id}
                      onClick={() => viewDevice(device.section_id, device.id)}
                      className="hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      {/* Row Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                      </td>

                      {/* Device Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {device.device_name || device.client_id}
                          </div>
                          <div className="text-xs text-gray-600">{device.client_id}</div>
                          {device.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                              <MapPin className="w-3 h-3" />
                              {device.location}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          device.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <Activity className="w-3 h-3" />
                          {device.is_active ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      {/* Temperature */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.temperature ? device.temperature.toFixed(1) : '-'}
                        </span>
                      </td>

                      {/* Static Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.static_pressure ? device.static_pressure.toFixed(1) : '-'}
                        </span>
                      </td>

                      {/* Differential Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.differential_pressure ? device.differential_pressure.toFixed(1) : '-'}
                        </span>
                      </td>

                      {/* Battery */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getBatteryColor(device.battery)}`}>
                          {device.battery ? `${device.battery.toFixed(1)}V` : '-'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => removeDevice(device.id, e)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          title="Remove from observation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        {devices.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Quick Access to Your Key Devices</p>
                <p className="text-blue-700">
                  Click on any row to view device details. To add more devices, visit the Sections page and click "Observe" on any device.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UnderObservation;
