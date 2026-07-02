import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { getDevices, getReadings } from '../services/api';
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

// Dot colors: green = online (reported within 24h), red = offline
const STATUS_COLORS = { online: '#22c55e', offline: '#ef4444' };

// Connection-line color per section (matches section colors used elsewhere)
const SECTION_LINE_COLORS = {
  'I': '#10b981',
  'II': '#a855f7',
  'III': '#f97316',
  'IV': '#ec4899',
  'V': '#06b6d4'
};

// Section boundary polygons (approximate pipeline territory outlines)
const sectionBoundaries = {
  'I': [
    [29.0, 70.0], [29.0, 73.0], [30.8, 73.0], [31.0, 72.0], [30.8, 70.5], [29.5, 70.0]
  ],
  'II': [
    [30.8, 72.0], [30.8, 73.8], [32.2, 73.8], [32.2, 72.0]
  ],
  'III': [
    [32.8, 72.0], [32.8, 74.0], [34.2, 74.0], [34.2, 72.0]
  ],
  'IV': [
    [31.0, 73.5], [31.0, 75.0], [32.8, 75.0], [32.8, 73.5]
  ],
  'V': [
    [33.5, 70.5], [33.5, 72.5], [35.0, 72.5], [35.0, 70.5]
  ]
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
  const [mapCenter, setMapCenter] = useState([30.3753, 69.3451]);
  const [mapZoom, setMapZoom] = useState(6);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [readingsMap, setReadingsMap] = useState({});
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

      // Batch fetch: single request for recent readings
      try {
        const result = await getReadings({ page_size: 200, page: 1 });
        const readings = result.data || [];
        // Group by device_id, keep latest per device
        const latestByDevice = {};
        for (const r of readings) {
          if (!r.device_id) continue;
          if (!latestByDevice[r.device_id] || new Date(r.timestamp) > new Date(latestByDevice[r.device_id].timestamp)) {
            latestByDevice[r.device_id] = r;
          }
        }
        setReadingsMap(latestByDevice);
      } catch (err) {
        console.error('Error fetching bulk readings:', err);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  // Devices report ~hourly, so "online" means it sent data within the last 24 hours
  const getDeviceStatus = (device) => {
    if (!device.last_seen) return 'offline';
    const diffHours = (new Date() - new Date(device.last_seen)) / 1000 / 60 / 60;
    return diffHours < 24 ? 'online' : 'offline';
  };

  // Extract section from client_id (e.g., "SMS-I-002" -> "I")
  const extractSection = (clientId) => {
    if (!clientId) return null;
    const match = clientId.match(/SMS-([IVX]+)-/);
    return match ? match[1] : null;
  };

  // Memoized valid devices
  const validDevices = useMemo(() => {
    return devices.filter(d => {
      if (d.latitude == null || d.longitude == null) return false;
      if (d.latitude === 0 && d.longitude === 0) return false;
      if (selectedSection !== 'ALL') {
        const deviceSection = extractSection(d.client_id);
        if (deviceSection !== selectedSection) return false;
      }
      return true;
    });
  }, [devices, selectedSection]);

  // Memoized status map
  const deviceStatusMap = useMemo(() => {
    const map = {};
    for (const d of validDevices) {
      map[d.id] = getDeviceStatus(d);
    }
    return map;
  }, [validDevices]);

  // Memoized stats
  const statusStats = useMemo(() => {
    const stats = { online: 0, offline: 0, total: validDevices.length };
    for (const d of validDevices) {
      if (deviceStatusMap[d.id] === 'online') stats.online++;
      else stats.offline++;
    }
    return stats;
  }, [validDevices, deviceStatusMap]);

  // Connection web: one polyline per section linking its devices in pipeline order (by client_id number)
  const connectionLines = useMemo(() => {
    const bySection = {};
    for (const d of validDevices) {
      const section = extractSection(d.client_id);
      if (!section) continue;
      (bySection[section] = bySection[section] || []).push(d);
    }
    return Object.entries(bySection)
      .map(([section, devs]) => {
        const sorted = [...devs].sort((a, b) => {
          const na = parseInt((a.client_id || '').split('-').pop(), 10) || 0;
          const nb = parseInt((b.client_id || '').split('-').pop(), 10) || 0;
          return na - nb;
        });
        return {
          section,
          color: SECTION_LINE_COLORS[section] || '#3b82f6',
          positions: sorted.map(d => [d.latitude, d.longitude])
        };
      })
      .filter(line => line.positions.length >= 2);
  }, [validDevices]);

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
    setSelectedDevice(null);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setMapCenter(section.center);
      setMapZoom(section.zoom);
    }
  };

  // Get reading for selected device
  const selectedReading = selectedDevice ? readingsMap[selectedDevice.id] : null;
  const selectedStatus = selectedDevice ? deviceStatusMap[selectedDevice.id] || getDeviceStatus(selectedDevice) : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Device Map</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Interactive map of IoT device locations across Pakistan</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Devices</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{statusStats.total}</p>
              </div>
              <div className="text-3xl">📡</div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-500 mt-1">{statusStats.online}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Offline</p>
                <p className="text-3xl font-bold text-red-500 mt-1">{statusStats.offline}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500"></div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="glass rounded-xl p-6 relative">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pakistan Device Locations</h2>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
                <span className="text-gray-600 dark:text-gray-400">Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
                <span className="text-gray-600 dark:text-gray-400">Offline</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-1 rounded bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Section connection</span>
              </div>
            </div>
          </div>

          {/* Section Filter Buttons */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Filter by Section:</p>
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

          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-[calc(100vh-280px)]">
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

              {/* Section boundary polygon */}
              {selectedSection !== 'ALL' && sectionBoundaries[selectedSection] && (
                <Polygon
                  positions={sectionBoundaries[selectedSection]}
                  pathOptions={{
                    color: '#3B82F6',
                    weight: 2,
                    opacity: 0.4,
                    fillColor: '#3B82F6',
                    fillOpacity: 0.08,
                  }}
                />
              )}

              {/* Connection web: section pipelines linking the devices */}
              {connectionLines.map((line) => (
                <Polyline
                  key={`line-${line.section}`}
                  positions={line.positions}
                  pathOptions={{ color: line.color, weight: 2.5, opacity: 0.65 }}
                />
              ))}

              {/* Device dots: green = online, red = offline — always visible, no clustering */}
              {validDevices.map((device) => {
                const status = deviceStatusMap[device.id] || 'offline';
                return (
                  <CircleMarker
                    key={device.id}
                    center={[device.latitude, device.longitude]}
                    radius={6}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 2,
                      fillColor: STATUS_COLORS[status],
                      fillOpacity: 1
                    }}
                    eventHandlers={{
                      click: () => handleDeviceClick(device)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>
                      <span className="font-semibold">{device.client_id}</span>
                      {' — '}
                      <span style={{ color: STATUS_COLORS[status], fontWeight: 700 }}>
                        {status.toUpperCase()}
                      </span>
                    </Tooltip>
                  </CircleMarker>
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

          {/* Slide-in Device Detail Panel */}
          <div
            className={`absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-l border-gray-200 dark:border-gray-700 z-[1000] transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              selectedDevice ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedDevice && (
              <div className="p-6">
                {/* Close button */}
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 pr-8">{selectedDevice.device_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedDevice.client_id}</p>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedStatus === 'online' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    selectedStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    selectedStatus === 'offline' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {(selectedStatus || 'unknown').toUpperCase()}
                  </span>
                </div>

                {/* Device Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Location</span>
                    <span className="text-gray-900 dark:text-white text-right">{selectedDevice.location}</span>
                  </div>
                  {selectedDevice.last_seen && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Last Seen</span>
                      <span className="text-gray-900 dark:text-white">{new Date(selectedDevice.last_seen).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Coordinates</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedDevice.latitude.toFixed(4)}, {selectedDevice.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Sensor Readings */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3">Latest Sensor Readings</h4>
                  {selectedReading ? (
                    <div className="space-y-2">
                      {selectedReading.temperature != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">Temperature</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.temperature}°C</span>
                        </div>
                      )}
                      {selectedReading.static_pressure != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">Static Pressure</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.static_pressure} bar</span>
                        </div>
                      )}
                      {selectedReading.differential_pressure != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">Diff Pressure</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.differential_pressure} bar</span>
                        </div>
                      )}
                      {selectedReading.volume != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">MMCF</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.volume.toFixed(3)}</span>
                        </div>
                      )}
                      {selectedReading.total_volume_flow != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">Flow Rate</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.total_volume_flow}</span>
                        </div>
                      )}
                      {selectedReading.battery != null && (
                        <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                          <span className="text-gray-600 dark:text-gray-400">Battery</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedReading.battery}%</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Reading at: {new Date(selectedReading.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No recent sensor data available</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Click on map markers to view device details • {devices.filter(d => d.latitude != null && d.longitude != null).length} devices on map • {devices.length} total devices
          </div>
        </div>

        {/* Device List */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Device List</h2>
          {loading ? (
            <div className="text-center text-gray-600 dark:text-gray-400 py-8">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="text-center text-gray-600 dark:text-gray-400 py-8">
              No devices found. Add devices to see them on the map.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {validDevices.map((device) => {
                const status = deviceStatusMap[device.id] || 'unknown';
                return (
                  <div
                    key={device.id}
                    onClick={() => handleDeviceClick(device)}
                    className="p-4 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/70 cursor-pointer transition-all duration-200 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{device.device_name}</h3>
                      <div className={`w-3 h-3 rounded-full ${
                        status === 'online' ? 'bg-green-500 animate-pulse' :
                        status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ID: {device.client_id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">📍 {device.location}</p>
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Device at Location</h2>
                {clickedLocation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setClickedLocation(null);
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl"
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
