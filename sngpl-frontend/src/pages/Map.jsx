import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for device status
const createCustomIcon = (status) => {
  const colors = {
    online: '#10B981',    // green
    warning: '#F59E0B',   // yellow
    offline: '#EF4444',   // red
    unknown: '#6B7280'    // gray
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${colors[status] || colors.unknown};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        ${status === 'online' ? 'animation: pulse 2s infinite;' : ''}
      ">
        📡
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Component to recenter map when devices change
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const Map = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mapCenter, setMapCenter] = useState([30.3753, 69.3451]); // Pakistan center (Multan area)
  const [mapZoom, setMapZoom] = useState(6);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [selectedSection, setSelectedSection] = useState('ALL'); // Section filter
  const [devicesWithReadings, setDevicesWithReadings] = useState([]); // Devices with latest readings
  const [newDevice, setNewDevice] = useState({
    client_id: '',
    device_name: '',
    location: '',
    latitude: 0,
    longitude: 0
  });

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);

      // Fetch latest reading for each device (only for devices with coordinates)
      const devicesWithCoords = data.filter(d => d.latitude && d.longitude && !(d.latitude === 0 && d.longitude === 0));
      const devicesWithData = await Promise.all(
        devicesWithCoords.slice(0, 50).map(async (device) => {
          try {
            const response = await fetch(`/api/analytics/readings?device_id=${device.id}&page_size=1&page=1`);
            if (response.ok) {
              const result = await response.json();
              const latestReading = result.data && result.data.length > 0 ? result.data[0] : null;
              return { ...device, latest_reading: latestReading };
            }
          } catch (err) {
            console.error(`Error fetching reading for ${device.id}:`, err);
          }
          return { ...device, latest_reading: null };
        })
      );

      setDevicesWithReadings(devicesWithData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.last_seen) return 'unknown';
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setClickedLocation({ lat, lng });
    setNewDevice({
      ...newDevice,
      latitude: lat,
      longitude: lng
    });
    setShowAddModal(true);
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/devices/', newDevice);
      toast.success('Device added successfully!');
      setShowAddModal(false);
      setClickedLocation(null);
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

  const handleDeviceClick = (device) => {
    if (device.latitude != null && device.longitude != null) {
      setSelectedDevice(device);
      setMapCenter([device.latitude, device.longitude]);
      setMapZoom(10);
    }
  };

  const majorCities = [
    { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
    { name: 'Lahore', lat: 31.5204, lng: 74.3587 },
    { name: 'Islamabad', lat: 33.6844, lng: 73.0479 },
    { name: 'Rawalpindi', lat: 33.5651, lng: 73.0169 },
    { name: 'Faisalabad', lat: 31.4504, lng: 73.1350 },
    { name: 'Multan', lat: 30.1575, lng: 71.5249 },
    { name: 'Peshawar', lat: 34.0151, lng: 71.5249 },
    { name: 'Quetta', lat: 30.1798, lng: 66.9750 },
  ];

  // Extract section from client_id (e.g., "SMS-I-002" -> "I")
  const extractSection = (clientId) => {
    if (!clientId) return null;
    const match = clientId.match(/SMS-([IVX]+)-/);
    return match ? match[1] : null;
  };

  // Filter devices with valid coordinates only
  const validDevices = devices.filter(d => {
    if (d.latitude == null || d.longitude == null) return false;
    if (d.latitude === 0 && d.longitude === 0) return false;

    // Apply section filter
    if (selectedSection !== 'ALL') {
      const deviceSection = extractSection(d.client_id);
      if (deviceSection !== selectedSection) return false;
    }

    return true;
  });

  const statusStats = {
    online: validDevices.filter(d => getDeviceStatus(d) === 'online').length,
    warning: validDevices.filter(d => getDeviceStatus(d) === 'warning').length,
    offline: validDevices.filter(d => getDeviceStatus(d) === 'offline').length,
    total: validDevices.length
  };

  // Section definitions
  const sections = [
    { id: 'ALL', name: 'All Sections', center: [30.3753, 69.3451], zoom: 6 },
    { id: 'I', name: 'Section I - Multan/BWP/Sahiwal', center: [30.1575, 71.5249], zoom: 8 },
    { id: 'II', name: 'Section II - Faisalabad/Sargodha', center: [31.4504, 73.1350], zoom: 8 },
    { id: 'III', name: 'Section III - Islamabad/Rawalpindi', center: [33.6844, 73.0479], zoom: 8 },
    { id: 'IV', name: 'Section IV - Lahore/Gujranwala', center: [31.5204, 74.3587], zoom: 8 },
    { id: 'V', name: 'Section V - Peshawar/Mardan', center: [34.0151, 71.5249], zoom: 8 },
  ];

  const handleSectionChange = (sectionId) => {
    setSelectedSection(sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setMapCenter(section.center);
      setMapZoom(section.zoom);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Device Map</h1>
            <p className="text-gray-400 mt-1">Interactive map of IoT device locations across Pakistan</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setMapCenter([30.3753, 69.3451]);
                setMapZoom(6);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
            >
              Reset View
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Devices</p>
                <p className="text-3xl font-bold text-white mt-1">{statusStats.total}</p>
              </div>
              <div className="text-3xl">📡</div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{statusStats.online}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Warning</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{statusStats.warning}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-500"></div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Offline</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{statusStats.offline}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500"></div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="glass rounded-xl p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Pakistan Device Locations</h2>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-400">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-gray-400">Warning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Offline</span>
              </div>
            </div>
          </div>

          {/* Section Filter Buttons */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Filter by Section:</p>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                    selectedSection === section.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-700" style={{ height: '600px' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapRecenter center={mapCenter} zoom={mapZoom} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Device Markers */}
              {validDevices.map((device) => {
                // Find the device with reading data
                const deviceWithReading = devicesWithReadings.find(d => d.id === device.id);
                const latestReading = deviceWithReading?.latest_reading;

                return (
                  <Marker
                    key={device.id}
                    position={[device.latitude, device.longitude]}
                    icon={createCustomIcon(getDeviceStatus(device))}
                    eventHandlers={{
                      click: () => handleDeviceClick(device)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[250px]">
                        <h3 className="font-bold text-lg mb-2">{device.device_name}</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>ID:</strong> {device.client_id}</p>
                          <p><strong>Location:</strong> {device.location}</p>
                          <p><strong>Status:</strong>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              getDeviceStatus(device) === 'online' ? 'bg-green-100 text-green-800' :
                              getDeviceStatus(device) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {getDeviceStatus(device).toUpperCase()}
                            </span>
                          </p>
                          {device.last_seen && (
                            <p><strong>Last Seen:</strong> {new Date(device.last_seen).toLocaleString()}</p>
                          )}

                          {/* Current Sensor Values */}
                          {latestReading ? (
                            <>
                              <hr className="my-2 border-gray-300" />
                              <p className="font-semibold text-blue-600 mb-1">Current Sensor Values:</p>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {latestReading.temperature != null && (
                                  <p><strong>Temp:</strong> {latestReading.temperature}°C</p>
                                )}
                                {latestReading.static_pressure != null && (
                                  <p><strong>Static P:</strong> {latestReading.static_pressure} bar</p>
                                )}
                                {latestReading.differential_pressure != null && (
                                  <p><strong>Diff P:</strong> {latestReading.differential_pressure} bar</p>
                                )}
                                {latestReading.volume != null && (
                                  <p><strong>MMCF:</strong> {latestReading.volume.toFixed(3)}</p>
                                )}
                                {latestReading.total_volume_flow != null && (
                                  <p><strong>Total Flow:</strong> {latestReading.total_volume_flow}</p>
                                )}
                                {latestReading.battery != null && (
                                  <p><strong>Battery:</strong> {latestReading.battery}%</p>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Reading at: {new Date(latestReading.timestamp).toLocaleString()}
                              </p>
                            </>
                          ) : (
                            <>
                              <hr className="my-2 border-gray-300" />
                              <p className="text-xs text-gray-500 italic">No recent sensor data available</p>
                            </>
                          )}

                          <p className="text-xs text-gray-500 mt-2">
                            Coordinates: {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Major Cities (Reference Points) */}
              {majorCities.map((city, index) => (
                <Marker
                  key={`city-${index}`}
                  position={[city.lat, city.lng]}
                  icon={L.divIcon({
                    className: 'city-marker',
                    html: `<div style="
                      background: rgba(59, 130, 246, 0.1);
                      border: 2px solid #3B82F6;
                      color: #3B82F6;
                      padding: 4px 8px;
                      border-radius: 4px;
                      font-size: 11px;
                      font-weight: bold;
                      white-space: nowrap;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    ">${city.name}</div>`,
                    iconSize: [60, 20],
                    iconAnchor: [30, 10]
                  })}
                />
              ))}
            </MapContainer>
          </div>

          <div className="mt-4 text-sm text-gray-400 text-center">
            Click on map markers to view device details • {devices.filter(d => d.latitude != null && d.longitude != null).length} devices on map • {devices.length} total devices
          </div>
        </div>

        {/* Device List */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Device List</h2>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No devices found. Add devices to see them on the map.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {validDevices.map((device) => {
                const status = getDeviceStatus(device);
                return (
                  <div
                    key={device.id}
                    onClick={() => handleDeviceClick(device)}
                    className="p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 cursor-pointer transition-all duration-200 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{device.device_name}</h3>
                      <div className={`w-3 h-3 rounded-full ${
                        status === 'online' ? 'bg-green-500 animate-pulse' :
                        status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">ID: {device.client_id}</p>
                    <p className="text-sm text-gray-400 mb-1">📍 {device.location}</p>
                    {device.latitude != null && device.longitude != null ? (
                      <p className="text-xs text-gray-500">
                        {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-xs text-red-400">
                        ⚠️ No coordinates set
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Add Device at Location</h2>
                {clickedLocation && (
                  <p className="text-sm text-gray-400 mt-1">
                    {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setClickedLocation(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Device ID</label>
                <input
                  type="text"
                  value={newDevice.client_id}
                  onChange={(e) => setNewDevice({...newDevice, client_id: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., modem2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Device Name</label>
                <input
                  type="text"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({...newDevice, device_name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Compressor Station 2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Location</label>
                <input
                  type="text"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Lahore, Pakistan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newDevice.latitude}
                    onChange={(e) => setNewDevice({...newDevice, latitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newDevice.longitude}
                    onChange={(e) => setNewDevice({...newDevice, longitude: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setClickedLocation(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Map;
