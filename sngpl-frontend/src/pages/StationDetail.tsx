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
import { AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import ExportModal from '../components/ExportModal';
import {
  TemperatureParameterSidebar,
  PressureParameterSidebar,
  DifferentialPressureParameterSidebar,
  VolumeParameterSidebar,
  FlowRateParameterSidebar,
  BatteryParameterSidebar
} from './StationDetail/ChartParameterSidebars';

interface DeviceReading {
  timestamp: string;
  temperature: number;
  static_pressure: number;
  max_static_pressure?: number;
  min_static_pressure?: number;
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

// Color indicator functions
const getTemperatureColor = (temp: number) => {
  if (temp < 0) return { bg: 'bg-red-100', text: 'text-red-600', status: 'V.Low', color: '#dc2626' };
  if (temp < 10) return { bg: 'bg-red-200', text: 'text-red-700', status: 'Low', color: '#f87171' };
  if (temp <= 120) return { bg: 'bg-green-100', text: 'text-green-600', status: 'Normal', color: '#16a34a' };
  return { bg: 'bg-yellow-100', text: 'text-yellow-600', status: 'High', color: '#eab308' };
};

const getStaticPressureColor = (pressure: number) => {
  if (pressure < 10) return { bg: 'bg-yellow-100', text: 'text-yellow-600', status: 'V.Low', color: '#eab308' };
  if (pressure <= 90) return { bg: 'bg-green-100', text: 'text-green-600', status: 'Normal', color: '#16a34a' };
  if (pressure <= 120) return { bg: 'bg-red-200', text: 'text-red-700', status: 'High', color: '#f87171' };
  return { bg: 'bg-red-100', text: 'text-red-600', status: 'V.High', color: '#dc2626' };
};

const getDifferentialPressureColor = (pressure: number) => {
  if (pressure < 0) return { bg: 'bg-yellow-100', text: 'text-yellow-600', status: 'V.Low', color: '#eab308' };
  if (pressure <= 300) return { bg: 'bg-green-100', text: 'text-green-600', status: 'Normal', color: '#16a34a' };
  if (pressure <= 400) return { bg: 'bg-red-200', text: 'text-red-700', status: 'High', color: '#f87171' };
  return { bg: 'bg-red-100', text: 'text-red-600', status: 'V.High', color: '#dc2626' };
};

const getBatteryColor = (voltage: number) => {
  if (voltage < 10) return { bg: 'bg-red-100', text: 'text-red-600', status: 'V.Low', color: '#dc2626' };
  if (voltage < 10.5) return { bg: 'bg-red-200', text: 'text-red-700', status: 'Low', color: '#f87171' };
  if (voltage <= 14) return { bg: 'bg-green-100', text: 'text-green-600', status: 'Normal', color: '#16a34a' };
  return { bg: 'bg-yellow-100', text: 'text-yellow-600', status: 'High', color: '#eab308' };
};

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

  // Fullscreen chart state
  const [isChartFullscreen, setIsChartFullscreen] = useState(false); // Temperature
  const [isPressureFullscreen, setIsPressureFullscreen] = useState(false); // Pressure History
  const [isDiffPFullscreen, setIsDiffPFullscreen] = useState(false); // Differential Pressure
  const [isVolumeFullscreen, setIsVolumeFullscreen] = useState(false); // Volume
  const [isFlowFullscreen, setIsFlowFullscreen] = useState(false); // Flow Rate
  const [isBatteryFullscreen, setIsBatteryFullscreen] = useState(false); // Battery
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px
  const [isResizing, setIsResizing] = useState(false);

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
      // Fetch latest 1000 readings for history logs
      const response = await fetch(`/api/analytics/readings?device_id=${stationId}&page_size=1000&page=1`);
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
            voltage: reading.battery || 12.5,
            color: (reading.battery || 12.5) >= 12.5 ? '#16a34a' : (reading.battery || 12.5) >= 11.8 ? '#eab308' : '#dc2626'
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
        temperature: 60 + Math.random() * 50,
        static_pressure: 40 + Math.random() * 60,
        max_static_pressure: 50 + Math.random() * 80,
        min_static_pressure: 30 + Math.random() * 40,
        differential_pressure: 50 + Math.random() * 200,
        volume: 5000 + Math.random() * 10000,
        total_volume_flow: 10000 + Math.random() * 15000,
        battery: 11.5 + Math.random() * 2
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
      const batteryLevel = 11.5 + Math.random() * 2; // 11.5V to 13.5V

      const staticP = 40 + Math.random() * 60;
      history.push({
        timestamp: time.toISOString(),
        temperature: 60 + Math.random() * 50,
        static_pressure: staticP,
        max_static_pressure: staticP + 10 + Math.random() * 30,
        min_static_pressure: staticP - 10 - Math.random() * 20,
        differential_pressure: 50 + Math.random() * 200,
        volume: 5000 + Math.random() * 10000,
        total_volume_flow: 10000 + Math.random() * 15000,
        battery: batteryLevel
      });

      battHist.push({
        timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        voltage: batteryLevel,
        color: batteryLevel >= 12.5 ? '#16a34a' : batteryLevel >= 11.8 ? '#eab308' : '#dc2626'
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
  // Filter data for charts (latest 50 readings max)
  const filterDataByDateRange = (startDate: string, endDate: string, limit: number = 50) => {
    if (!historyData || historyData.length === 0) {
      return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = historyData.filter(d => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    // Limit to latest N readings for performance and clarity
    const limited = filtered.slice(0, limit);

    // If filter returns nothing but we have data, show last 24 hours as fallback
    if (limited.length === 0 && historyData.length > 0) {
      console.warn('[Filter] No data in selected range, showing last 24 hours');
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const fallbackFiltered = historyData.filter(d => {
        const timestamp = new Date(d.timestamp);
        return timestamp >= twentyFourHoursAgo && timestamp <= now;
      });

      // Apply limit to fallback data as well
      return fallbackFiltered.slice(0, limit);
    }

    return limited;
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
  const batteryLevel = latest?.battery || 12.5; // Battery voltage (V)

  // Get last 50 readings for card mini-charts
  const getLast50Readings = () => {
    if (!historyData || historyData.length === 0) return [];
    return historyData.slice(0, 50);
  };

  const last50 = getLast50Readings();

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

        {/* Current Values - 8 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="mt-2">
              <span className={`text-xs font-medium ${getTemperatureColor(latest?.temperature || 0).text}`}>
                {getTemperatureColor(latest?.temperature || 0).status}
              </span>
            </div>
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
            <div className="mt-2">
              <span className={`text-xs font-medium ${getStaticPressureColor(latest?.static_pressure || 0).text}`}>
                {getStaticPressureColor(latest?.static_pressure || 0).status}
              </span>
            </div>
          </motion.div>

          {/* Max Static Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Max Static Pressure</p>
                <p className="text-xs text-gray-500">PSI</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.max_static_pressure?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">PSI</span>
            </div>
            <div className="mt-2">
              <span className={`text-xs font-medium ${getStaticPressureColor(latest?.max_static_pressure || 0).text}`}>
                {getStaticPressureColor(latest?.max_static_pressure || 0).status}
              </span>
            </div>
          </motion.div>

          {/* Min Static Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Min Static Pressure</p>
                <p className="text-xs text-gray-500">PSI</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600 transform rotate-180" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.min_static_pressure?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-gray-500">PSI</span>
            </div>
            <div className="mt-2">
              <span className={`text-xs font-medium ${getStaticPressureColor(latest?.min_static_pressure || 0).text}`}>
                {getStaticPressureColor(latest?.min_static_pressure || 0).status}
              </span>
            </div>
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
            <div className="mt-2">
              <span className={`text-xs font-medium ${getDifferentialPressureColor(latest?.differential_pressure || 0).text}`}>
                {getDifferentialPressureColor(latest?.differential_pressure || 0).status}
              </span>
            </div>
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
          </motion.div>

          {/* Battery */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Battery</p>
                <p className="text-xs text-gray-500">Volts</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Battery className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {batteryLevel.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">V</span>
            </div>
            <div className="mt-2">
              <span className={`text-xs font-medium ${getBatteryColor(batteryLevel).text}`}>
                {getBatteryColor(batteryLevel).status}
              </span>
            </div>
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
                onClick={() => setIsChartFullscreen(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Fullscreen"
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
              <AreaChart data={filterDataByDateRange(tempStartDate, tempEndDate, 50)}>
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
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
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
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">V.Low (&lt;0°F)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-600">Low (0-10°F)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (10-120°F)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">High (&gt;120°F)</span>
              </div>
            </div>
          </div>

          {/* Combined Pressure Chart - Static, Max, Min */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-green-600" />
                Pressure History (Static / Max / Min)
              </h3>
              <button
                onClick={() => setIsPressureFullscreen(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Fullscreen"
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
              <LineChart data={filterDataByDateRange(staticPStartDate, staticPEndDate, 50)}>
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
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line type="monotone" dataKey="static_pressure" name="Static" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="max_static_pressure" name="Max" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="min_static_pressure" name="Min" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">V.Low (&lt;10 PSI)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (10-90 PSI)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-600">High (90-120 PSI)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">V.High (&gt;130 PSI)</span>
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
                onClick={() => setIsDiffPFullscreen(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Fullscreen"
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
              <AreaChart data={filterDataByDateRange(diffPStartDate, diffPEndDate, 50)}>
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
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
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
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                <span className="text-xs text-gray-600">V.Low (&lt;0 IWC)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-xs text-gray-600">Normal (0-300 IWC)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs text-gray-600">High (300-400 IWC)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-xs text-gray-600">V.High (&gt;400 IWC)</span>
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
                onClick={() => setIsVolumeFullscreen(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Fullscreen"
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
              <AreaChart data={filterDataByDateRange(volumeStartDate, volumeEndDate, 50)}>
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
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
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
                onClick={() => setIsFlowFullscreen(true)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Fullscreen"
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
              <AreaChart data={filterDataByDateRange(flowStartDate, flowEndDate, 50)}>
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
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
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
              onClick={() => setIsBatteryFullscreen(true)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fullscreen"
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
            <BarChart data={filterDataByDateRange(batteryStartDate, batteryEndDate, 50)} layout="horizontal">
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
              <YAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: any) => {
                  const status = value >= 12.5 ? 'Good' : value >= 11.8 ? 'Medium' : 'Low';
                  return [`${value?.toFixed(2) || '0'}V (${status})`, 'Battery'];
                }}
              />
              <Bar dataKey="battery" radius={[4, 4, 0, 0]}>
                {filterDataByDateRange(batteryStartDate, batteryEndDate, 50).map((entry: any, index: number) => {
                  const batteryValue = entry.battery || 12.5;
                  const color = batteryValue >= 12.5 ? '#16a34a' : batteryValue >= 11.8 ? '#eab308' : '#dc2626';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-600">V.Low (&lt;10V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded"></div>
              <span className="text-sm text-gray-600">Low (10-10.5V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-600">Normal (10.5-14V)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-sm text-gray-600">High (&gt;14V)</span>
            </div>
          </div>
        </div>

        {/* Complete History Logs */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complete History Logs</h3>
                <p className="text-sm text-gray-600 mt-1">All device readings for selected time range</p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>
            <CustomDateRangeSelector
              startDate={historyLogStartDate}
              endDate={historyLogEndDate}
              onStartChange={setHistoryLogStartDate}
              onEndChange={setHistoryLogEndDate}
            />
          </div>
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Temperature (°F)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Static P (PSI)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Max P (PSI)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Min P (PSI)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Diff P (IWC)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Volume (MCF)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Flow (MCF/day)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Battery (V)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filterDataByDateRange(historyLogStartDate, historyLogEndDate, 1000).map((reading, index) => (
                  <tr key={index} className="hover:bg-gray-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatTimestamp(reading.timestamp)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTemperatureColor(reading.temperature).text}`}>
                        {reading.temperature.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStaticPressureColor(reading.static_pressure).text}`}>
                        {reading.static_pressure.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStaticPressureColor(reading.max_static_pressure || 0).text}`}>
                        {reading.max_static_pressure?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getStaticPressureColor(reading.min_static_pressure || 0).text}`}>
                        {reading.min_static_pressure?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getDifferentialPressureColor(reading.differential_pressure).text}`}>
                        {reading.differential_pressure.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{reading.volume.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-cyan-700">{reading.total_volume_flow.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getBatteryColor(reading.battery || 0).text}`}>
                        {reading.battery?.toFixed(2) || '-'}V
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Temperature Chart Modal */}
      {isChartFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-orange-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Thermometer className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Temperature History</h2>
                  <p className="text-sm text-orange-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsChartFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-md p-6 h-full border border-gray-200">
                <CustomDateRangeSelector
                  startDate={tempStartDate}
                  endDate={tempEndDate}
                  onStartChange={setTempStartDate}
                  onEndChange={setTempEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={filterDataByDateRange(tempStartDate, tempEndDate, 200)}>
                    <defs>
                      <linearGradient id="colorTempGreenFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
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
                          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                        } else {
                          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
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
                      stroke="#dc2626"
                      strokeWidth={2}
                      fill="url(#colorTempGreenFull)"
                      dot={{ fill: '#dc2626', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Temperature Parameter */}
          <TemperatureParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
            getTemperatureColor={getTemperatureColor}
          />
        </div>
      )}

      {/* Fullscreen Differential Pressure Chart Modal */}
      {isDiffPFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-blue-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Wind className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Differential Pressure History</h2>
                  <p className="text-sm text-blue-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDiffPFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gradient-to-br from-white to-blue-50/30">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 h-full border border-blue-100">
                <CustomDateRangeSelector
                  startDate={diffPStartDate}
                  endDate={diffPEndDate}
                  onStartChange={setDiffPStartDate}
                  onEndChange={setDiffPEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={filterDataByDateRange(diffPStartDate, diffPEndDate, 200)}>
                    <defs>
                      <linearGradient id="colorDiffPGreenFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        const start = new Date(diffPStartDate);
                        const end = new Date(diffPEndDate);
                        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                        if (diffDays > 2) {
                          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                        } else {
                          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Differential Pressure (IWC)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => {
                        const color = getValueColor(value, 'differential_pressure');
                        const status = color === '#16a34a' ? 'Normal' : color === '#eab308' ? 'Warning' : 'Danger';
                        return [`${value.toFixed(2)} IWC (${status})`, 'Differential Pressure'];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="differential_pressure"
                      stroke="#dc2626"
                      strokeWidth={2}
                      fill="url(#colorDiffPGreenFull)"
                      dot={{ fill: '#dc2626', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Differential Pressure Parameter */}
          <DifferentialPressureParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
            getDifferentialPressureColor={getDifferentialPressureColor}
          />
        </div>
      )}

      {/* Fullscreen Pressure History Chart Modal */}
      {isPressureFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-green-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Gauge className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Pressure History</h2>
                  <p className="text-sm text-green-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPressureFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-md p-6 h-full border border-gray-200">
                <CustomDateRangeSelector
                  startDate={staticPStartDate}
                  endDate={staticPEndDate}
                  onStartChange={setStaticPStartDate}
                  onEndChange={setStaticPEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={filterDataByDateRange(staticPStartDate, staticPEndDate, 200)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        const start = new Date(staticPStartDate);
                        const end = new Date(staticPEndDate);
                        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                        if (diffDays > 2) {
                          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                        } else {
                          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Pressure (PSI)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="static_pressure" name="Static" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="max_static_pressure" name="Max" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="min_static_pressure" name="Min" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Pressure Parameters */}
          <PressureParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
            getStaticPressureColor={getStaticPressureColor}
          />
        </div>
      )}

      {/* Fullscreen Volume Chart Modal */}
      {isVolumeFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-purple-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Droplets className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Volume History</h2>
                  <p className="text-sm text-purple-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsVolumeFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-md p-6 h-full border border-gray-200">
                <CustomDateRangeSelector
                  startDate={volumeStartDate}
                  endDate={volumeEndDate}
                  onStartChange={setVolumeStartDate}
                  onEndChange={setVolumeEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={filterDataByDateRange(volumeStartDate, volumeEndDate, 200)}>
                    <defs>
                      <linearGradient id="colorVolumeGreenFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        const start = new Date(volumeStartDate);
                        const end = new Date(volumeEndDate);
                        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                        if (diffDays > 2) {
                          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                        } else {
                          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Volume (MCF)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => [`${value.toFixed(1)} MCF`, 'Volume']}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#9333ea"
                      strokeWidth={2}
                      fill="url(#colorVolumeGreenFull)"
                      dot={{ fill: '#9333ea', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Volume Parameter */}
          <VolumeParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
          />
        </div>
      )}

      {/* Fullscreen Flow Rate Chart Modal */}
      {isFlowFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-teal-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Flow Rate History</h2>
                  <p className="text-sm text-teal-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsFlowFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-md p-6 h-full border border-gray-200">
                <CustomDateRangeSelector
                  startDate={flowStartDate}
                  endDate={flowEndDate}
                  onStartChange={setFlowStartDate}
                  onEndChange={setFlowEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={filterDataByDateRange(flowStartDate, flowEndDate, 200)}>
                    <defs>
                      <linearGradient id="colorFlowGreenFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        const start = new Date(flowStartDate);
                        const end = new Date(flowEndDate);
                        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

                        if (diffDays > 2) {
                          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
                        } else {
                          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Flow Rate (MCF/day)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => [`${value.toFixed(1)} MCF/day`, 'Flow Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_volume_flow"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      fill="url(#colorFlowGreenFull)"
                      dot={{ fill: '#14b8a6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Flow Rate Parameter */}
          <FlowRateParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
          />
        </div>
      )}

      {/* Fullscreen Battery Chart Modal */}
      {isBatteryFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-50 via-white to-yellow-50 flex"
          onMouseMove={(e) => {
            if (isResizing) {
              const newWidth = window.innerWidth - e.clientX;
              if (newWidth >= 250 && newWidth <= 500) {
                setSidebarWidth(newWidth);
              }
            }
          }}
          onMouseUp={() => setIsResizing(false)}
        >
          {/* Main Chart Area */}
          <div className="flex-1 flex flex-col" style={{ marginRight: `${sidebarWidth}px` }}>
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Battery className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">Battery Voltage History</h2>
                  <p className="text-sm text-yellow-100 mt-0.5">{deviceData.device_name} • {deviceData.location}</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatteryFullscreen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                title="Exit Fullscreen"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Chart Content */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="bg-white rounded-lg shadow-md p-6 h-full border border-gray-200">
                <CustomDateRangeSelector
                  startDate={batteryStartDate}
                  endDate={batteryEndDate}
                  onStartChange={setBatteryStartDate}
                  onEndChange={setBatteryEndDate}
                />
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={filterDataByDateRange(batteryStartDate, batteryEndDate, 200)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="category"
                      dataKey="timestamp"
                      stroke="#6b7280"
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
                    <YAxis
                      type="number"
                      stroke="#6b7280"
                      style={{ fontSize: '13px' }}
                      domain={['auto', 'auto']}
                      label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 14 } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px' }}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any) => {
                        const batteryValue = value || 12.5;
                        const status = batteryValue >= 12.5 ? 'Optimal' : batteryValue >= 11.8 ? 'Good' : batteryValue >= 11.0 ? 'Warning' : batteryValue >= 10.5 ? 'Low' : batteryValue >= 10.0 ? 'V.Low' : 'Critical';
                        return [`${batteryValue.toFixed(2)}V (${status})`, 'Battery'];
                      }}
                    />
                    <Bar dataKey="battery" radius={[4, 4, 0, 0]}>
                      {filterDataByDateRange(batteryStartDate, batteryEndDate, 200).map((entry: any, index: number) => {
                        const batteryValue = entry.battery || 12.5;
                        const color = batteryValue >= 12.5 ? '#16a34a' : batteryValue >= 11.8 ? '#eab308' : '#dc2626';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded"></div>
                    <span className="text-sm text-gray-600">Optimal (≥12.5V)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                    <span className="text-sm text-gray-600">Good (11.8-12.5V)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span className="text-sm text-gray-600">Low (&lt;11.8V)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="fixed top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors z-10"
            style={{ right: `${sidebarWidth}px` }}
            onMouseDown={() => setIsResizing(true)}
          />

          {/* Right Sidebar - Battery Parameter */}
          <BatteryParameterSidebar
            width={sidebarWidth}
            deviceData={deviceData}
            latest={latest}
            batteryLevel={batteryLevel}
            getBatteryColor={getBatteryColor}
          />
        </div>
      )}

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
