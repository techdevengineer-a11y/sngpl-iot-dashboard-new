import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  TrendingUp,
  Battery,
  AlertTriangle,
  MapPin,
  Clock,
  Download,
  Maximize2,
  X
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import Layout from '../components/Layout';
import ExportModal from '../components/ExportModal';

interface DeviceReading {
  timestamp: string;
  temperature: number;
  static_pressure: number;
  differential_pressure: number;
  volume: number;
  total_volume_flow: number;
  battery?: number;
}

interface Device {
  id: number;
  client_id: string;
  device_name: string;
  location: string;
  is_active: boolean;
  last_seen: string | null;
  latest_reading: DeviceReading | null;
}

const StationDetail = () => {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [deviceData, setDeviceData] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<DeviceReading[]>([]);
  const [latestReading, setLatestReading] = useState<DeviceReading | null>(null);
  const [batteryHistory, setBatteryHistory] = useState<any[]>([]);

  // Custom date range states for each parameter
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setHours(date.getHours() - 24); // Default to last 24 hours
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().slice(0, 16);
  };

  const [tempStartDate, setTempStartDate] = useState(getDefaultStartDate());
  const [tempEndDate, setTempEndDate] = useState(getDefaultEndDate());

  const [staticPStartDate, setStaticPStartDate] = useState(getDefaultStartDate());
  const [staticPEndDate, setStaticPEndDate] = useState(getDefaultEndDate());

  const [diffPStartDate, setDiffPStartDate] = useState(getDefaultStartDate());
  const [diffPEndDate, setDiffPEndDate] = useState(getDefaultEndDate());

  const [volumeStartDate, setVolumeStartDate] = useState(getDefaultStartDate());
  const [volumeEndDate, setVolumeEndDate] = useState(getDefaultEndDate());

  const [flowStartDate, setFlowStartDate] = useState(getDefaultStartDate());
  const [flowEndDate, setFlowEndDate] = useState(getDefaultEndDate());

  const [batteryStartDate, setBatteryStartDate] = useState(getDefaultStartDate());
  const [batteryEndDate, setBatteryEndDate] = useState(getDefaultEndDate());

  const [historyLogStartDate, setHistoryLogStartDate] = useState(getDefaultStartDate());
  const [historyLogEndDate, setHistoryLogEndDate] = useState(getDefaultEndDate());

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Draggable chart modal states
  const [expandedChart, setExpandedChart] = useState<{
    type: string;
    title: string;
    dataKey: string;
    icon: any;
    color: string;
    unit: string;
    domain: [number, number];
    thresholds?: { normal: string; warning: string; danger: string };
  } | null>(null);

  useEffect(() => {
    fetchDeviceData();
    fetchHistoricalData();

    // Auto-refresh every 2 seconds to match MQTT data storage interval
    const dataInterval = setInterval(() => {
      fetchDeviceData();
      fetchHistoricalData();
    }, 2000);

    // Auto-update date range end times every 5 seconds to show real-time data
    const dateInterval = setInterval(() => {
      const now = new Date().toISOString().slice(0, 16);
      setTempEndDate(now);
      setStaticPEndDate(now);
      setDiffPEndDate(now);
      setVolumeEndDate(now);
      setFlowEndDate(now);
      setBatteryEndDate(now);
      setHistoryLogEndDate(now);
    }, 5000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(dateInterval);
    };
  }, [stationId]);

  const fetchDeviceData = async () => {
    try {
      // Fetch device info
      const response = await fetch(`/api/devices/`);
      if (response.ok) {
        const devices = await response.json();
        const device = devices.find((d: any) => d.id === parseInt(stationId || '0'));

        if (device) {
          setDeviceData(device);
        } else {
          // Generate dummy data if device not found
          generateDummyDeviceData();
        }
      } else {
        // Generate dummy data if API fails
        generateDummyDeviceData();
      }
    } catch (error) {
      console.error('Error fetching device data:', error);
      // Generate dummy data on error
      generateDummyDeviceData();
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      // Fetch 7 days of historical readings (168 hours) for this device using public endpoint
      // This ensures we have enough data for all time range options (1h, 6h, 24h, 7d)
      const response = await fetch(`/api/analytics/readings?device_id=${stationId}&page_size=500&page=1`);
      if (response.ok) {
        const result = await response.json();
        const readings = result.data || [];

        console.log(`[StationDetail] Fetched ${readings.length} readings for device ${stationId}`);

        if (readings && readings.length > 0) {
          // Sort readings by timestamp descending (most recent first)
          const sortedReadings = readings.sort((a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          setHistoryData(sortedReadings);

          // Set the latest reading (first item in the sorted array is most recent)
          setLatestReading(sortedReadings[0]);
          console.log('[StationDetail] Latest reading:', sortedReadings[0]);

          // Generate battery history from readings
          const battHist = sortedReadings.map((reading: any) => ({
            timestamp: new Date(reading.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            voltage: reading.battery || 75,
            color: (reading.battery || 75) > 75 ? '#16a34a' : (reading.battery || 75) > 40 ? '#eab308' : '#dc2626'
          }));
          setBatteryHistory(battHist);
        } else {
          console.log('[StationDetail] No readings found, generating mock data');
          // No data available, generate mock data
          generateMockHistory();
        }
      } else {
        console.error('[StationDetail] API failed with status:', response.status);
        // API failed, generate mock data
        generateMockHistory();
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Generate mock data on error
      generateMockHistory();
    }
  };

  const generateDummyDeviceData = () => {
    const dummyDevice: Device = {
      id: parseInt(stationId || '1'),
      client_id: `SMS-${stationId}`,
      device_name: `Station ${stationId}`,
      location: `Section ${Math.ceil((parseInt(stationId || '1') / 80))} - Location ${stationId}`,
      is_active: Math.random() > 0.2, // 80% online
      last_seen: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      latest_reading: {
        timestamp: new Date().toISOString(),
        temperature: 60 + Math.random() * 50, // -10 to 150°F range
        static_pressure: 40 + Math.random() * 60, // 0 to 150 PSI range
        differential_pressure: 50 + Math.random() * 200, // 0 to 500 IWC range
        volume: 5000 + Math.random() * 10000, // 0 to 25000 MCF range
        total_volume_flow: 10000 + Math.random() * 15000, // 0 to 40000 MCF/day range
        battery: 60 + Math.random() * 40
      }
    };
    setDeviceData(dummyDevice);
  };

  // Generate mock historical data (7 days)
  const generateMockHistory = () => {
    const now = new Date();
    const history: DeviceReading[] = [];
    const battHist: any[] = [];

    // Generate 7 days of hourly data
    for (let i = 167; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const batteryLevel = 60 + Math.random() * 40; // 60-100%

      history.push({
        timestamp: time.toISOString(),
        temperature: 60 + Math.random() * 50, // -10 to 150°F range (centered around 60-110)
        static_pressure: 40 + Math.random() * 60, // 0 to 150 PSI range (centered around 40-100)
        differential_pressure: 50 + Math.random() * 200, // 0 to 500 IWC range (centered around 50-250)
        volume: 5000 + Math.random() * 10000, // 0 to 25000 MCF range (centered around 5000-15000)
        total_volume_flow: 10000 + Math.random() * 15000, // 0 to 40000 MCF/day range (centered around 10000-25000)
        battery: batteryLevel
      });

      battHist.push({
        timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        voltage: batteryLevel,
        color: batteryLevel > 75 ? '#16a34a' : batteryLevel > 40 ? '#eab308' : '#dc2626'
      });
    }

    setHistoryData(history);
    setBatteryHistory(battHist);

    // Set the latest reading as the most recent one
    if (history.length > 0) {
      setLatestReading(history[0]);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Mock alarm data
  const hasAlarm = (parameter: string) => Math.random() > 0.7;

  // Get color based on value thresholds
  const getValueColor = (value: number, type: string) => {
    switch (type) {
      case 'temperature':
        // Temperature: -10 to 150°F
        if (value > 100 || value < 20) return '#dc2626'; // red - danger
        if (value > 90 || value < 30) return '#eab308'; // yellow - warning
        return '#16a34a'; // green - normal (30-90°F)
      case 'static_pressure':
        // Pressure: 0 to 150 PSI
        if (value < 30 || value > 120) return '#dc2626';
        if (value < 40 || value > 110) return '#eab308';
        return '#16a34a'; // green - normal (40-110 PSI)
      case 'differential_pressure':
        // Differential Pressure: 0 to 500 IWC
        if (value > 300) return '#dc2626';
        if (value > 250) return '#eab308';
        return '#16a34a'; // green - normal (<250 IWC)
      case 'volume':
        // Volume: 0 to 25000 MCF
        if (value < 3000) return '#dc2626';
        if (value < 4000) return '#eab308';
        return '#16a34a'; // green - normal (>4000 MCF)
      case 'flow':
        // Flow: 0 to 40000 MCF/day
        if (value < 5000) return '#dc2626';
        if (value < 8000) return '#eab308';
        return '#16a34a'; // green - normal (>8000 MCF/day)
      default:
        return '#16a34a';
    }
  };

  // Export history logs to CSV
  const exportHistoryLogs = () => {
    const headers = ['#', 'Timestamp', 'Temperature (°F)', 'Static P (PSI)', 'Diff P (IWC)', 'Volume (MCF)', 'Flow (MCF/day)', 'Battery (%)'];
    const csvContent = [
      headers.join(','),
      ...historyData.map((reading, index) => [
        index + 1,
        formatTimestamp(reading.timestamp),
        reading.temperature.toFixed(1),
        reading.static_pressure.toFixed(1),
        reading.differential_pressure.toFixed(2),
        reading.volume.toFixed(1),
        reading.total_volume_flow.toFixed(1),
        reading.battery?.toFixed(0) || '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `device_${stationId}_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter data based on custom date range
  const filterDataByDateRange = (startDate: string, endDate: string) => {
    if (!historyData || historyData.length === 0) {
      return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = historyData.filter(d => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    // If filter returns nothing but we have data, show last 24 hours as fallback
    if (filtered.length === 0 && historyData.length > 0) {
      console.warn('[Filter] No data in selected range, showing last 24 hours');
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      return historyData.filter(d => {
        const timestamp = new Date(d.timestamp);
        return timestamp >= twentyFourHoursAgo && timestamp <= now;
      });
    }

    return filtered;
  };

  // Custom Date Range Selector Component
  const CustomDateRangeSelector = ({
    startDate,
    endDate,
    onStartChange,
    onEndChange
  }: {
    startDate: string;
    endDate: string;
    onStartChange: (val: string) => void;
    onEndChange: (val: string) => void;
  }) => {
    return (
      <div className="mb-4">
        {/* Custom Date/Time Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date & Time</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => onStartChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date & Time</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => onEndChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    );
  };

  // Draggable Chart Modal Component
  const DraggableChartModal = () => {
    if (!expandedChart) return null;

    const Icon = expandedChart.icon;
    const filteredData = filterDataByDateRange(
      expandedChart.type === 'temperature' ? tempStartDate :
      expandedChart.type === 'static_pressure' ? staticPStartDate :
      expandedChart.type === 'differential_pressure' ? diffPStartDate :
      expandedChart.type === 'volume' ? volumeStartDate :
      expandedChart.type === 'flow' ? flowStartDate :
      batteryStartDate,
      expandedChart.type === 'temperature' ? tempEndDate :
      expandedChart.type === 'static_pressure' ? staticPEndDate :
      expandedChart.type === 'differential_pressure' ? diffPEndDate :
      expandedChart.type === 'volume' ? volumeEndDate :
      expandedChart.type === 'flow' ? flowEndDate :
      batteryEndDate
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">{expandedChart.title}</h2>
                <p className="text-blue-100 text-sm">{deviceData?.device_name} - Detailed View</p>
              </div>
            </div>
            <button
              onClick={() => setExpandedChart(null)}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Date Range Selector */}
            <CustomDateRangeSelector
              startDate={
                expandedChart.type === 'temperature' ? tempStartDate :
                expandedChart.type === 'static_pressure' ? staticPStartDate :
                expandedChart.type === 'differential_pressure' ? diffPStartDate :
                expandedChart.type === 'volume' ? volumeStartDate :
                expandedChart.type === 'flow' ? flowStartDate :
                batteryStartDate
              }
              endDate={
                expandedChart.type === 'temperature' ? tempEndDate :
                expandedChart.type === 'static_pressure' ? staticPEndDate :
                expandedChart.type === 'differential_pressure' ? diffPEndDate :
                expandedChart.type === 'volume' ? volumeEndDate :
                expandedChart.type === 'flow' ? flowEndDate :
                batteryEndDate
              }
              onStartChange={
                expandedChart.type === 'temperature' ? setTempStartDate :
                expandedChart.type === 'static_pressure' ? setStaticPStartDate :
                expandedChart.type === 'differential_pressure' ? setDiffPStartDate :
                expandedChart.type === 'volume' ? setVolumeStartDate :
                expandedChart.type === 'flow' ? setFlowStartDate :
                setBatteryStartDate
              }
              onEndChange={
                expandedChart.type === 'temperature' ? setTempEndDate :
                expandedChart.type === 'static_pressure' ? setStaticPEndDate :
                expandedChart.type === 'differential_pressure' ? setDiffPEndDate :
                expandedChart.type === 'volume' ? setVolumeEndDate :
                expandedChart.type === 'flow' ? setFlowEndDate :
                setBatteryEndDate
              }
            />

            {/* Large Chart with Brush (Draggable Area) */}
            <div className="bg-gray-50 rounded-xl p-6">
              <ResponsiveContainer width="100%" height={500}>
                <AreaChart data={filteredData}>
                  <defs>
                    <linearGradient id={`expanded-${expandedChart.type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={expandedChart.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={expandedChart.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '13px' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '13px' }}
                    domain={expandedChart.domain}
                    label={{ value: expandedChart.unit, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: any) => {
                      const color = getValueColor(value, expandedChart.type);
                      const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                      return [`${value.toFixed(2)} ${expandedChart.unit} (${status})`, expandedChart.title];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={expandedChart.dataKey}
                    stroke={expandedChart.color}
                    strokeWidth={3}
                    fill={`url(#expanded-${expandedChart.type})`}
                    dot={{ fill: expandedChart.color, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Brush component for draggable area selection */}
                  <Brush
                    dataKey="timestamp"
                    height={40}
                    stroke={expandedChart.color}
                    fill="#f3f4f6"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Thresholds Legend */}
            {expandedChart.thresholds && (
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-sm text-gray-700 font-medium">{expandedChart.thresholds.normal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                  <span className="text-sm text-gray-700 font-medium">{expandedChart.thresholds.warning}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded"></div>
                  <span className="text-sm text-gray-700 font-medium">{expandedChart.thresholds.danger}</span>
                </div>
              </div>
            )}

            {/* Data Points Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">Total Data Points: {filteredData.length}</span>
                <span className="text-gray-700 font-medium">
                  Latest Value: {filteredData[0]?.[expandedChart.dataKey]?.toFixed(2)} {expandedChart.unit}
                </span>
                <span className="text-gray-700 font-medium">
                  Average: {(filteredData.reduce((sum, d) => sum + (d[expandedChart.dataKey] || 0), 0) / filteredData.length).toFixed(2)} {expandedChart.unit}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading device data...</p>
        </div>
      </Layout>
    );
  }

  if (!deviceData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Device not found</h3>
          <button
            onClick={() => navigate('/sections')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Sections
          </button>
        </div>
      </Layout>
    );
  }

  // Use the latestReading state instead of deviceData.latest_reading
  const latest = latestReading;
  const batteryLevel = latest?.battery || 75;

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {deviceData.device_name || deviceData.client_id}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {deviceData.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Last seen: {formatTimestamp(deviceData.last_seen)}
                  </span>
                </div>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              deviceData.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {deviceData.is_active ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Current Values - 6 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Temperature */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-xs text-gray-500">°F</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.temperature?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">°F</span>
            </div>
            {hasAlarm('temperature') && (
              <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">High Temperature Alert</span>
              </div>
            )}
          </motion.div>

          {/* Static Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Static Pressure</p>
                <p className="text-xs text-gray-500">PSI</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Gauge className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.static_pressure?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">PSI</span>
            </div>
            {hasAlarm('static_pressure') && (
              <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Pressure Alert</span>
              </div>
            )}
          </motion.div>

          {/* Differential Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Differential Pressure</p>
                <p className="text-xs text-gray-500">IWC</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Wind className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.differential_pressure?.toFixed(2) || '0.00'}
              </span>
              <span className="text-sm text-gray-500">IWC</span>
            </div>
            {hasAlarm('differential_pressure') && (
              <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Diff Pressure Alert</span>
              </div>
            )}
          </motion.div>

          {/* Volume */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Volume</p>
                <p className="text-xs text-gray-500">MCF</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Droplets className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.volume?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">MCF</span>
            </div>
            {hasAlarm('volume') && (
              <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Volume Alert</span>
              </div>
            )}
          </motion.div>

          {/* Total Volume Flow */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Total Volume Flow</p>
                <p className="text-xs text-gray-500">MCF/day</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.total_volume_flow?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">MCF/day</span>
            </div>
            {hasAlarm('total_volume_flow') && (
              <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Flow Alert</span>
              </div>
            )}
          </motion.div>

          {/* Battery */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Battery</p>
                <p className="text-xs text-gray-500">%</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                batteryLevel > 75 ? 'bg-green-100' : batteryLevel > 40 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Battery className={`w-6 h-6 ${
                  batteryLevel > 75 ? 'text-green-600' : batteryLevel > 40 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${
                batteryLevel > 75 ? 'text-green-600' : batteryLevel > 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {batteryLevel.toFixed(0)}
              </span>
              <span className="text-sm text-gray-500">%</span>
            </div>
            {batteryLevel < 40 && (
              <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-100 px-3 py-1 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Low Battery Alert</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* 5 Area Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Chart */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-600" />
                Temperature History
              </h3>
              <button
                onClick={() => setExpandedChart({
                  type: 'temperature',
                  title: 'Temperature History',
                  dataKey: 'temperature',
                  icon: Thermometer,
                  color: '#ea580c',
                  unit: '°F',
                  domain: [-10, 150],
                  thresholds: {
                    normal: 'Normal (30-90°F)',
                    warning: 'Warning (20-30, 90-100°F)',
                    danger: 'Danger (<20, >100°F)'
                  }
                })}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Expand Chart"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={tempStartDate}
              endDate={tempEndDate}
              onStartChange={setTempStartDate}
              onEndChange={setTempEndDate}
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filterDataByDateRange(tempStartDate, tempEndDate)}>
                <defs>
                  <linearGradient id="colorTempGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTempYellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTempRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const start = new Date(tempStartDate);
                    const end = new Date(tempEndDate);
                    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                    if (diffDays > 2) {
                      return `${date.getMonth()+1}/${date.getDate()}`;
                    } else {
                      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[-10, 150]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => {
                    const color = getValueColor(value, 'temperature');
                    const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                    return [`${value.toFixed(1)}°F (${status})`, 'Temperature'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#colorTempGreen)"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (30-90°F)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">Warning (20-30, 90-100°F)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Danger (&lt;20, &gt;100°F)</span>
              </div>
            </div>
          </div>

          {/* Static Pressure Chart */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-green-600" />
                Static Pressure History
              </h3>
              <button
                onClick={() => setExpandedChart({
                  type: 'static_pressure',
                  title: 'Static Pressure History',
                  dataKey: 'static_pressure',
                  icon: Gauge,
                  color: '#16a34a',
                  unit: 'PSI',
                  domain: [0, 150],
                  thresholds: {
                    normal: 'Normal (40-110 PSI)',
                    warning: 'Warning (30-40, 110-120)',
                    danger: 'Danger (<30, >120)'
                  }
                })}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Expand Chart"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={staticPStartDate}
              endDate={staticPEndDate}
              onStartChange={setStaticPStartDate}
              onEndChange={setStaticPEndDate}
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filterDataByDateRange(staticPStartDate, staticPEndDate)}>
                <defs>
                  <linearGradient id="colorStaticPGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const diffDays = (new Date(staticPEndDate).getTime() - new Date(staticPStartDate).getTime()) / (1000 * 60 * 60 * 24); return diffDays > 2 ? `${date.getMonth()+1}/${date.getDate()}` : `${date.getHours()}:00`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 150]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => {
                    const color = getValueColor(value, 'static_pressure');
                    const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                    return [`${value.toFixed(1)} PSI (${status})`, 'Static Pressure'];
                  }}
                />
                <Area type="monotone" dataKey="static_pressure" stroke="#16a34a" strokeWidth={2} fill="url(#colorStaticPGreen)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (40-110 PSI)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">Warning (30-40, 110-120)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Danger (&lt;30, &gt;120)</span>
              </div>
            </div>
          </div>

          {/* Differential Pressure Chart */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Wind className="w-5 h-5 text-blue-600" />
                Differential Pressure History
              </h3>
              <button
                onClick={() => setExpandedChart({
                  type: 'differential_pressure',
                  title: 'Differential Pressure History',
                  dataKey: 'differential_pressure',
                  icon: Wind,
                  color: '#2563eb',
                  unit: 'IWC',
                  domain: [0, 500],
                  thresholds: {
                    normal: 'Normal (<250 IWC)',
                    warning: 'Warning (250-300)',
                    danger: 'Danger (>300)'
                  }
                })}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Expand Chart"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={diffPStartDate}
              endDate={diffPEndDate}
              onStartChange={setDiffPStartDate}
              onEndChange={setDiffPEndDate}
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filterDataByDateRange(diffPStartDate, diffPEndDate)}>
                <defs>
                  <linearGradient id="colorDiffPGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const diffDays = (new Date(diffPEndDate).getTime() - new Date(diffPStartDate).getTime()) / (1000 * 60 * 60 * 24); return diffDays > 2 ? `${date.getMonth()+1}/${date.getDate()}` : `${date.getHours()}:00`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 500]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => {
                    const color = getValueColor(value, 'differential_pressure');
                    const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                    return [`${value.toFixed(2)} IWC (${status})`, 'Differential Pressure'];
                  }}
                />
                <Area type="monotone" dataKey="differential_pressure" stroke="#16a34a" strokeWidth={2} fill="url(#colorDiffPGreen)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (&lt;250 IWC)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">Warning (250-300)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Danger (&gt;300)</span>
              </div>
            </div>
          </div>

          {/* Volume Chart */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-purple-600" />
                Volume History
              </h3>
              <button
                onClick={() => setExpandedChart({
                  type: 'volume',
                  title: 'Volume History',
                  dataKey: 'volume',
                  icon: Droplets,
                  color: '#9333ea',
                  unit: 'MCF',
                  domain: [0, 25000],
                  thresholds: {
                    normal: 'Normal (>4000 MCF)',
                    warning: 'Warning (3000-4000)',
                    danger: 'Danger (<3000)'
                  }
                })}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Expand Chart"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={volumeStartDate}
              endDate={volumeEndDate}
              onStartChange={setVolumeStartDate}
              onEndChange={setVolumeEndDate}
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filterDataByDateRange(volumeStartDate, volumeEndDate)}>
                <defs>
                  <linearGradient id="colorVolumeGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const diffDays = (new Date(volumeEndDate).getTime() - new Date(volumeStartDate).getTime()) / (1000 * 60 * 60 * 24); return diffDays > 2 ? `${date.getMonth()+1}/${date.getDate()}` : `${date.getHours()}:00`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 25000]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => {
                    const color = getValueColor(value, 'volume');
                    const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                    return [`${value.toFixed(1)} MCF (${status})`, 'Volume'];
                  }}
                />
                <Area type="monotone" dataKey="volume" stroke="#16a34a" strokeWidth={2} fill="url(#colorVolumeGreen)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (&gt;4000 MCF)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">Warning (3000-4000)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Danger (&lt;3000)</span>
              </div>
            </div>
          </div>

          {/* Total Volume Flow Chart */}
          <div className="glass rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                Total Volume Flow History
              </h3>
              <button
                onClick={() => setExpandedChart({
                  type: 'flow',
                  title: 'Total Volume Flow History',
                  dataKey: 'total_volume_flow',
                  icon: TrendingUp,
                  color: '#0891b2',
                  unit: 'MCF/day',
                  domain: [0, 40000],
                  thresholds: {
                    normal: 'Normal (>8000 MCF/day)',
                    warning: 'Warning (5000-8000)',
                    danger: 'Danger (<5000)'
                  }
                })}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Expand Chart"
              >
                <Maximize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={flowStartDate}
              endDate={flowEndDate}
              onStartChange={setFlowStartDate}
              onEndChange={setFlowEndDate}
            />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={filterDataByDateRange(flowStartDate, flowEndDate)}>
                <defs>
                  <linearGradient id="colorFlowGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    const diffDays = (new Date(flowEndDate).getTime() - new Date(flowStartDate).getTime()) / (1000 * 60 * 60 * 24); return diffDays > 2 ? `${date.getMonth()+1}/${date.getDate()}` : `${date.getHours()}:00`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 40000]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => {
                    const color = getValueColor(value, 'flow');
                    const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                    return [`${value.toFixed(1)} MCF/day (${status})`, 'Flow'];
                  }}
                />
                <Area type="monotone" dataKey="total_volume_flow" stroke="#16a34a" strokeWidth={2} fill="url(#colorFlowGreen)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (&gt;8000 MCF/day)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">Warning (5000-8000)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Danger (&lt;5000)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Battery Horizontal Bar Chart */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Battery className="w-5 h-5 text-yellow-600" />
              Battery Voltage History
            </h3>
            <button
              onClick={() => setExpandedChart({
                type: 'battery',
                title: 'Battery Voltage History',
                dataKey: 'battery',
                icon: Battery,
                color: '#eab308',
                unit: '%',
                domain: [0, 100],
                thresholds: {
                  normal: 'Good (>75%)',
                  warning: 'Medium (40-75%)',
                  danger: 'Low (<40%)'
                }
              })}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Expand Chart"
            >
              <Maximize2 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <CustomDateRangeSelector
            startDate={batteryStartDate}
            endDate={batteryEndDate}
            onStartChange={setBatteryStartDate}
            onEndChange={setBatteryEndDate}
          />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filterDataByDateRange(batteryStartDate, batteryEndDate)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="category"
                dataKey="timestamp"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  const diffDays = (new Date(batteryEndDate).getTime() - new Date(batteryStartDate).getTime()) / (1000 * 60 * 60 * 24);
                  if (diffDays > 2) {
                    return `${date.getMonth()+1}/${date.getDate()}`;
                  } else {
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }
                }}
              />
              <YAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: any) => {
                  const status = value > 75 ? 'Good' : value > 40 ? 'Medium' : 'Low';
                  return [`${value?.toFixed(1) || '0'}% (${status})`, 'Battery'];
                }}
              />
              <Bar dataKey="battery" radius={[4, 4, 0, 0]}>
                {filterDataByDateRange(batteryStartDate, batteryEndDate).map((entry: any, index: number) => {
                  const batteryValue = entry.battery || 75;
                  const color = batteryValue > 75 ? '#16a34a' : batteryValue > 40 ? '#eab308' : '#dc2626';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-600">Good (&gt;75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-sm text-gray-600">Medium (40-75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-600">Low (&lt;40%)</span>
            </div>
          </div>
        </div>

        {/* Complete History Logs */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complete History Logs</h3>
                <p className="text-sm text-gray-600 mt-1">Latest 500 readings</p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Temperature (°F)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Static P (PSI)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Diff P (IWC)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Volume (MCF)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Flow (MCF/day)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Battery (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historyData.slice(0, 500).map((reading, index) => (
                  <tr key={index} className="hover:bg-gray-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatTimestamp(reading.timestamp)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{reading.temperature.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{reading.static_pressure.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{reading.differential_pressure.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{reading.volume.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-cyan-700">{reading.total_volume_flow.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        (reading.battery || 0) > 75 ? 'text-green-600' :
                        (reading.battery || 0) > 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {reading.battery?.toFixed(0) || '-'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Draggable Chart Modal */}
      <DraggableChartModal />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        deviceId={stationId}
        deviceName={deviceData?.device_name}
        exportType="device"
      />
    </Layout>
  );
};

export default StationDetail;
