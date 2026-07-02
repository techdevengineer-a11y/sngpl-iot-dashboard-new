import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { getDevices, getReadings, getDeviceReadings } from '../services/api';
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

// The map shows Section II only (Faisalabad/Sargodha)
const SECTION_II_CENTER = [31.4504, 73.1350];
const SECTION_II_ZOOM = 8;

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
  const [mapCenter, setMapCenter] = useState(SECTION_II_CENTER);
  const [mapZoom, setMapZoom] = useState(SECTION_II_ZOOM);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [readingsMap, setReadingsMap] = useState({});
  const [flowHistory, setFlowHistory] = useState([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const navigate = useNavigate();
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

  // Memoized valid devices — Section II only
  const validDevices = useMemo(() => {
    return devices.filter(d => {
      if (extractSection(d.client_id) !== 'II') return false;
      if (d.latitude == null || d.longitude == null) return false;
      if (d.latitude === 0 && d.longitude === 0) return false;
      return true;
    });
  }, [devices]);

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

  const handleDeviceClick = async (device) => {
    if (device.latitude == null || device.longitude == null) return;
    setSelectedDevice(device);
    setMapCenter([device.latitude, device.longitude]);
    setMapZoom(10);

    // Load the station's recent flow history for the panel graph
    setFlowLoading(true);
    setFlowHistory([]);
    try {
      const readings = await getDeviceReadings(device.client_id, 24);
      const list = Array.isArray(readings) ? readings : (readings?.data || []);
      const chartData = list
        .slice()
        .reverse() // oldest -> newest for the chart
        .map(r => ({
          timestamp: r.timestamp,
          flow: Number(r.total_volume_flow) || 0
        }));
      setFlowHistory(chartData);
    } catch (err) {
      console.error('Error fetching flow history:', err);
    } finally {
      setFlowLoading(false);
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

  // Station search matches (max 8)
  const searchMatches = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (!q) return [];
    return validDevices
      .filter(d =>
        (d.client_id || '').toLowerCase().includes(q) ||
        (d.device_name || '').toLowerCase().includes(q) ||
        (d.location || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [mapSearch, validDevices]);

  // "2 h ago" style relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'never';
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    return `${Math.floor(hrs / 24)} d ago`;
  };

  // Get reading for selected device
  const selectedReading = selectedDevice ? readingsMap[selectedDevice.id] : null;
  const selectedStatus = selectedDevice ? deviceStatusMap[selectedDevice.id] || getDeviceStatus(selectedDevice) : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Section II Device Map</h1>
            <p className="text-gray-600 mt-1">Live station map — Faisalabad / Sargodha. Green = online, red = offline. Click a dot for its flow graph.</p>
          </div>
          <button
            onClick={() => {
              setMapCenter(SECTION_II_CENTER);
              setMapZoom(SECTION_II_ZOOM);
              setSelectedDevice(null);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
          >
            Reset View
          </button>
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
          <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Section II Station Locations</h2>
            <div className="flex items-center gap-4">
              {/* Station search */}
              <div className="relative">
                <input
                  type="text"
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  placeholder="Search station by ID, name or location..."
                  className="w-72 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchMatches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[2000] overflow-hidden">
                    {searchMatches.map(d => {
                      const s = deviceStatusMap[d.id] || 'offline';
                      return (
                        <button
                          key={d.id}
                          onClick={() => { handleDeviceClick(d); setMapSearch(''); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="font-mono font-semibold text-gray-900">{d.client_id}</span>
                          <span className="text-gray-500 truncate">{d.device_name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
                  <span className="text-gray-600">Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
                  <span className="text-gray-600">Offline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-gray-200 h-[calc(100vh-230px)] min-h-[500px]">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapRecenter center={mapCenter} zoom={mapZoom} />

              {/* Bright, clean basemap */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

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
            className={`absolute top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-[1000] transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              selectedDevice ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedDevice && (
              <div className="p-6">
                {/* Close button */}
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
                >
                  ✕
                </button>

                <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">{selectedDevice.device_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{selectedDevice.client_id}</p>

                {/* Status Badge + last seen */}
                <div className="mb-4 flex items-center gap-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    selectedStatus === 'online'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {(selectedStatus || 'offline').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">last data {timeAgo(selectedDevice.last_seen)}</span>
                </div>

                {/* Device Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Location</span>
                    <span className="text-gray-900 text-right">{selectedDevice.location}</span>
                  </div>
                  {selectedDevice.last_seen && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Seen</span>
                      <span className="text-gray-900">{new Date(selectedDevice.last_seen).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Coordinates</span>
                    <span className="text-gray-900">
                      {selectedDevice.latitude.toFixed(4)}, {selectedDevice.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Flow Graph */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <h4 className="text-sm font-semibold text-blue-600 mb-3">Flow Graph — last {flowHistory.length || 24} readings</h4>
                  {flowLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : flowHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={flowHistory} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                        <defs>
                          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => {
                            const d = new Date(value);
                            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                          }}
                          stroke="#9ca3af"
                          style={{ fontSize: '10px' }}
                        />
                        <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} />
                        <ChartTooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value) => [`${value} MCF/day`, 'Flow']}
                        />
                        <Area
                          type="monotone"
                          dataKey="flow"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#flowGradient)"
                          dot={{ fill: '#3b82f6', r: 2 }}
                          activeDot={{ r: 5, fill: '#3b82f6' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No flow data available for this station</p>
                  )}
                </div>

                {/* Latest SMS Reading */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-blue-600 mb-3">Latest SMS Reading</h4>
                  {selectedReading ? (
                    <div className="space-y-2">
                      {selectedReading.temperature != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Temperature</span>
                          <span className="text-gray-900 font-medium">{selectedReading.temperature} °F</span>
                        </div>
                      )}
                      {selectedReading.static_pressure != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Static Pressure</span>
                          <span className="text-gray-900 font-medium">{selectedReading.static_pressure} PSI</span>
                        </div>
                      )}
                      {selectedReading.differential_pressure != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Diff Pressure</span>
                          <span className="text-gray-900 font-medium">{selectedReading.differential_pressure} IWC</span>
                        </div>
                      )}
                      {selectedReading.volume != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Volume</span>
                          <span className="text-gray-900 font-medium">{selectedReading.volume.toFixed(3)} MCF</span>
                        </div>
                      )}
                      {selectedReading.total_volume_flow != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Flow Rate</span>
                          <span className="text-gray-900 font-medium">{selectedReading.total_volume_flow} MCF/day</span>
                        </div>
                      )}
                      {selectedReading.battery != null && (
                        <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-600">Battery</span>
                          <span className="text-gray-900 font-medium">{selectedReading.battery} V</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Reading at: {new Date(selectedReading.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No recent SMS data available</p>
                  )}
                </div>

                {/* Full station report */}
                <button
                  onClick={() => navigate(`/trends/${selectedDevice.client_id}`)}
                  className="mt-5 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Open Station Report →
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            Click a dot to view the station's flow graph • {validDevices.length} Section II stations on map
          </div>
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
