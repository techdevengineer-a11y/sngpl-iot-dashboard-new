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
  Clock
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';

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
  // T18-T114 Analytics Parameters
  last_hour_flow_time?: number;      // T18: hours
  last_hour_diff_pressure?: number;  // T19: IWC
  last_hour_static_pressure?: number; // T110: PSI
  last_hour_temperature?: number;     // T111: °F
  last_hour_volume?: number;          // T112: MCF
  last_hour_energy?: number;          // T113
  specific_gravity?: number;          // T114
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

// Color indicators for T18-T114 analytics parameters
const getGenericGreenColor = () => {
  return { bg: 'bg-green-100', text: 'text-green-600', status: 'Normal', color: '#16a34a' };
};

const Trends = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [deviceData, setDeviceData] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<DeviceReading[]>([]);
  const [latestReading, setLatestReading] = useState<DeviceReading | null>(null);
  const [batteryHistory, setBatteryHistory] = useState<any[]>([]);

  // History logs pagination (1000 loaded, 100 per page = 10 pages)
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 100;

  // Custom date range states for each parameter
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days for more data
    // Format for datetime-local: YYYY-MM-DDThh:mm (local time, not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    // Format for datetime-local: YYYY-MM-DDThh:mm (local time, not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  // T18-T114 Analytics Parameters Date Ranges
  const [t18StartDate, setT18StartDate] = useState(getDefaultStartDate());
  const [t18EndDate, setT18EndDate] = useState(getDefaultEndDate());

  const [t19StartDate, setT19StartDate] = useState(getDefaultStartDate());
  const [t19EndDate, setT19EndDate] = useState(getDefaultEndDate());

  const [t110StartDate, setT110StartDate] = useState(getDefaultStartDate());
  const [t110EndDate, setT110EndDate] = useState(getDefaultEndDate());

  const [t111StartDate, setT111StartDate] = useState(getDefaultStartDate());
  const [t111EndDate, setT111EndDate] = useState(getDefaultEndDate());

  const [t112StartDate, setT112StartDate] = useState(getDefaultStartDate());
  const [t112EndDate, setT112EndDate] = useState(getDefaultEndDate());

  const [t113StartDate, setT113StartDate] = useState(getDefaultStartDate());
  const [t113EndDate, setT113EndDate] = useState(getDefaultEndDate());

  const [t114StartDate, setT114StartDate] = useState(getDefaultStartDate());
  const [t114EndDate, setT114EndDate] = useState(getDefaultEndDate());

  const [historyLogStartDate, setHistoryLogStartDate] = useState(getDefaultStartDate());
  const [historyLogEndDate, setHistoryLogEndDate] = useState(getDefaultEndDate());

  useEffect(() => {
    // Initial fetch on mount
    fetchDeviceData();
    fetchHistoricalData();

    // Auto-refresh device data every 30 seconds for better performance
    // Historical data is only fetched once on mount to avoid wasteful API calls
    const dataInterval = setInterval(() => {
      fetchDeviceData(); // Only fetch device metadata
      // Removed: fetchHistoricalData() - no need to refetch 1000 records every 10s
    }, 30000); // Increased from 10s to 30s

    // Auto-update date range end times every 5 seconds to show real-time data
    const dateInterval = setInterval(() => {
      const now = new Date().toISOString().slice(0, 16);

      setTempEndDate(now);
      setStaticPEndDate(now);
      setDiffPEndDate(now);
      setVolumeEndDate(now);
      setFlowEndDate(now);
      setBatteryEndDate(now);
      // T18-T114 Analytics Parameters
      setT18EndDate(now);
      setT19EndDate(now);
      setT110EndDate(now);
      setT111EndDate(now);
      setT112EndDate(now);
      setT113EndDate(now);
      setT114EndDate(now);
      setHistoryLogEndDate(now);
    }, 5000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(dateInterval);
    };
  }, [deviceId]);

  const fetchDeviceData = async () => {
    try {
      // Fetch device info
      const response = await fetch(`/api/devices/`);
      if (response.ok) {
        const devices = await response.json();
        // Match by client_id (e.g., "SNGPL-001") not by numeric id
        const device = devices.find((d: any) => d.client_id === deviceId);

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
      const response = await fetch(`/api/analytics/readings?client_id=${deviceId}&page_size=1000&page=1`);
      if (response.ok) {
        const result = await response.json();
        const readings = result.data || [];

        // OPTIMIZATION: Reduced logging for better performance
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Trends] Fetched ${readings.length} readings for device ${deviceId}`);
        }

        if (readings && readings.length > 0) {
          // Sort readings by timestamp descending (most recent first)
          const sortedReadings = readings.sort((a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          setHistoryData(sortedReadings);

          // Set the latest reading (first item in the sorted array is most recent)
          setLatestReading(sortedReadings[0]);

          // OPTIMIZATION: Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            console.log('[Trends] Latest reading:', sortedReadings[0]);
            console.log('[Trends] T18-T114 values in latest reading:', {
              T18: sortedReadings[0].last_hour_flow_time,
              T19: sortedReadings[0].last_hour_diff_pressure,
              T110: sortedReadings[0].last_hour_static_pressure,
              T111: sortedReadings[0].last_hour_temperature,
              T112: sortedReadings[0].last_hour_volume,
              T113: sortedReadings[0].last_hour_energy,
              T114: sortedReadings[0].specific_gravity
            });
          }

          // Generate battery history from readings
          const battHist = sortedReadings.map((reading: any) => ({
            timestamp: new Date(reading.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            voltage: reading.battery || 12.5,
            color: (reading.battery || 12.5) >= 12.5 ? '#16a34a' : (reading.battery || 12.5) >= 11.8 ? '#eab308' : '#dc2626'
          }));
          setBatteryHistory(battHist);
        } else {
          console.log('[Trends] No readings found, generating mock data');
          // No data available, generate mock data
          generateMockHistory();
        }
      } else {
        console.error('[Trends] API failed with status:', response.status);
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
      id: parseInt(deviceId || '1'),
      client_id: `SMS-${deviceId}`,
      device_name: `Station ${deviceId}`,
      location: `Section ${Math.ceil((parseInt(deviceId || '1') / 80))} - Location ${deviceId}`,
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

  // Filter to show only hourly readings (one per hour) to avoid showing duplicate last_hour values
  const getHourlyReadings = (readings: DeviceReading[], limit: number = 500) => {
    const hourlyReadings: DeviceReading[] = [];
    const seenHours = new Set<string>();

    for (const reading of readings) {
      if (!reading.timestamp) continue;

      // Get hour key (YYYY-MM-DD-HH format)
      const date = new Date(reading.timestamp);
      const hourKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;

      // Only include first reading from each hour
      if (!seenHours.has(hourKey)) {
        seenHours.add(hourKey);
        hourlyReadings.push(reading);

        // Stop if we've reached the limit
        if (hourlyReadings.length >= limit) break;
      }
    }

    return hourlyReadings;
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

  // Filter data based on custom date range
  // OPTIMIZATION: Filter data for charts (latest 20 readings max)
  const filterDataByDateRange = (startDate: string, endDate: string, limit: number = 20) => {
    if (!historyData || historyData.length === 0) {
      return [];
    }

    // For datetime-local inputs, we need to treat them as local time, not UTC
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = historyData.filter(d => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    // OPTIMIZATION: Removed verbose logging for better performance
    // Only log in development if needed for debugging

    // Limit to latest N readings for performance and clarity
    const limited = filtered.slice(0, limit);

    // Determine which data to use (filtered or fallback)
    let dataToClean = limited;

    // If filter returns nothing but we have data, use fallback data
    if (limited.length === 0 && historyData.length > 0) {
      dataToClean = historyData.slice(0, limit);
    }

    // Clean the data: Replace null/undefined values with 0 for charts to render properly
    // Use Number() to force conversion, which turns null/undefined/NaN to 0
    const cleanedData = dataToClean.map(reading => ({
      ...reading,
      last_hour_flow_time: Number(reading.last_hour_flow_time) || 0,
      last_hour_diff_pressure: Number(reading.last_hour_diff_pressure) || 0,
      last_hour_static_pressure: Number(reading.last_hour_static_pressure) || 0,
      last_hour_temperature: Number(reading.last_hour_temperature) || 0,
      last_hour_volume: Number(reading.last_hour_volume) || 0,
      last_hour_energy: Number(reading.last_hour_energy) || 0,
      specific_gravity: Number(reading.specific_gravity) || 0
    }));

    return cleanedData;
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
            onClick={() => navigate('/advanced-reports')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Advanced Reports
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
  const hourlyData = getHourlyReadings(historyData, 1000);

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

        {/* T18-T114 Analytics Parameters - 7 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Last Hour Flow Time */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Flow Time</p>
                <p className="text-xs text-gray-500">hours</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_flow_time ?? '0'}
              </span>
              <span className="text-sm text-gray-500">hrs</span>
            </div>
          </motion.div>

          {/* Last Hour Diff Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Diff Pressure</p>
                <p className="text-xs text-gray-500">IWC</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Wind className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_diff_pressure ?? '0'}
              </span>
              <span className="text-sm text-gray-500">IWC</span>
            </div>
          </motion.div>

          {/* Last Hour Static Pressure */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Static Pressure</p>
                <p className="text-xs text-gray-500">PSI</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Gauge className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_static_pressure ?? '0'}
              </span>
              <span className="text-sm text-gray-500">PSI</span>
            </div>
          </motion.div>

          {/* Last Hour Temperature */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Temperature</p>
                <p className="text-xs text-gray-500">°F</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_temperature ?? '0'}
              </span>
              <span className="text-sm text-gray-500">°F</span>
            </div>
          </motion.div>

          {/* Last Hour Volume */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Volume</p>
                <p className="text-xs text-gray-500">MCF</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                <Droplets className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_volume ?? '0'}
              </span>
              <span className="text-sm text-gray-500">MCF</span>
            </div>
          </motion.div>

          {/* Last Hour Energy */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Last Hour Energy</p>
                <p className="text-xs text-gray-500">Energy</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Battery className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.last_hour_energy ?? '0'}
              </span>
            </div>
          </motion.div>

          {/* Specific Gravity */}
          <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600">Specific Gravity</p>
                <p className="text-xs text-gray-500">Gravity</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {latest?.specific_gravity ?? '0'}
              </span>
            </div>
          </motion.div>
        </div>

        {/* 7 Individual Charts for T18-T114 Analytics Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Last Hour Flow Time Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Last Hour Flow Time History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t18StartDate}
              endDate={t18EndDate}
              onStartChange={setT18StartDate}
              onEndChange={setT18EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t18StartDate, t18EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'} hours`, 'Flow Time']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_flow_time"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Last Hour Diff Pressure Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Wind className="w-5 h-5 text-purple-600" />
                Last Hour Diff Pressure History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t19StartDate}
              endDate={t19EndDate}
              onStartChange={setT19StartDate}
              onEndChange={setT19EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t19StartDate, t19EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'} IWC`, 'Diff Pressure']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_diff_pressure"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Last Hour Static Pressure Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-green-600" />
                Last Hour Static Pressure History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t110StartDate}
              endDate={t110EndDate}
              onStartChange={setT110StartDate}
              onEndChange={setT110EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t110StartDate, t110EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'} PSI`, 'Static Pressure']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_static_pressure"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Last Hour Temperature Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-600" />
                Last Hour Temperature History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t111StartDate}
              endDate={t111EndDate}
              onStartChange={setT111StartDate}
              onEndChange={setT111EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t111StartDate, t111EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'} °F`, 'Temperature']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_temperature"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Last Hour Volume Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-600" />
                Last Hour Volume History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t112StartDate}
              endDate={t112EndDate}
              onStartChange={setT112StartDate}
              onEndChange={setT112EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t112StartDate, t112EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'} MCF`, 'Volume']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_volume"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Last Hour Energy Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Battery className="w-5 h-5 text-yellow-600" />
                Last Hour Energy History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t113StartDate}
              endDate={t113EndDate}
              onStartChange={setT113StartDate}
              onEndChange={setT113EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t113StartDate, t113EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'}`, 'Energy']}
                />
                <Line
                  type="monotone"
                  dataKey="last_hour_energy"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Specific Gravity Chart */}
          <div className="glass rounded-xl p-6" style={{ minHeight: '350px' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Specific Gravity History
              </h3>
            </div>
            <CustomDateRangeSelector
              startDate={t114StartDate}
              endDate={t114EndDate}
              onStartChange={setT114StartDate}
              onEndChange={setT114EndDate}
            />
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <LineChart data={filterDataByDateRange(t114StartDate, t114EndDate, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                  }}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: any) => [`${value ?? '0'}`, 'Specific Gravity']}
                />
                <Line
                  type="monotone"
                  dataKey="specific_gravity"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#16a34a' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complete History Logs */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Complete History Logs</h3>
              <p className="text-sm text-gray-600 mt-1">{hourlyData.length} readings — Page {historyPage} of {Math.ceil(hourlyData.length / historyPerPage)}</p>
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Flow Time (hrs)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Diff P (IWC)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Static P (PSI)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Temp (°F)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Volume (MCF)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Energy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Sp. Gravity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hourlyData.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage).map((reading, index) => (
                  <tr key={index} className="hover:bg-gray-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700">{(historyPage - 1) * historyPerPage + index + 1}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatTimestamp(reading.timestamp)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-700">
                        {reading.last_hour_flow_time ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-purple-700">
                        {reading.last_hour_diff_pressure ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-700">
                        {reading.last_hour_static_pressure ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-orange-700">
                        {reading.last_hour_temperature ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-cyan-700">
                        {reading.last_hour_volume ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-yellow-700">
                        {reading.last_hour_energy ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-indigo-700">
                        {reading.specific_gravity ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {hourlyData.length > historyPerPage && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {(historyPage - 1) * historyPerPage + 1}–{Math.min(historyPage * historyPerPage, hourlyData.length)} of {hourlyData.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryPage(1)}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {(() => {
                  const totalPages = Math.ceil(hourlyData.length / historyPerPage);
                  const maxVisible = 5;
                  let start = Math.max(1, historyPage - Math.floor(maxVisible / 2));
                  let end = Math.min(totalPages, start + maxVisible - 1);
                  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                  const pages = [];
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setHistoryPage(i)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          i === historyPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
                <button
                  onClick={() => setHistoryPage(p => Math.min(Math.ceil(hourlyData.length / historyPerPage), p + 1))}
                  disabled={historyPage === Math.ceil(hourlyData.length / historyPerPage)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setHistoryPage(Math.ceil(hourlyData.length / historyPerPage))}
                  disabled={historyPage === Math.ceil(hourlyData.length / historyPerPage)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default Trends;
