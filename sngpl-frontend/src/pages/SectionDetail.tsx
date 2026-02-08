import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Gauge, Thermometer, Activity, Wind, Droplets, WifiOff, AlertTriangle, Battery, TrendingUp, Download, Eye, EyeOff } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import ExportModal from '../components/ExportModal';

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
  device_type: string;
  location: string;
  region?: string;
  section?: string;
  latitude: number | null;
  longitude: number | null;
  section_id: number | null;
  is_active: boolean;
  last_seen: string | null;
  latest_reading: DeviceReading | null;
}

interface SectionData {
  section_id: string;
  section_name: string;
  device_count: number;
  devices: Device[];
}

const SectionDetail = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlarmsOnly, setShowAlarmsOnly] = useState(false);
  const [flowHistoryData, setFlowHistoryData] = useState<any[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [observedDevices, setObservedDevices] = useState<number[]>([]);

  // Load observed devices from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('observed_devices');
    if (saved) {
      try {
        const devices = JSON.parse(saved);
        const deviceIds = devices.map((d: any) => d.id);
        setObservedDevices(deviceIds);
      } catch (e) {
        console.error('Error loading observed devices:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (sectionId) {
      fetchSectionDevices();
      // Refresh every 10 seconds for smooth updates
      const interval = setInterval(() => {
        fetchSectionDevices();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [sectionId]);

  // Regenerate flow history whenever section data changes
  useEffect(() => {
    if (sectionData?.devices && sectionData.devices.length > 0) {
      generateFlowHistory();
    }
  }, [sectionData]);

  const fetchSectionDevices = async () => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/devices`);
      if (response.ok) {
        const data = await response.json();

        // Sort devices: active devices first, then by client_id
        if (data.devices && Array.isArray(data.devices)) {
          data.devices.sort((a: Device, b: Device) => {
            // First sort by active status (active first)
            if (a.is_active !== b.is_active) {
              return b.is_active ? 1 : -1;
            }
            // Then sort by client_id
            return (a.client_id || '').localeCompare(b.client_id || '');
          });
        }

        setSectionData(data);
      } else {
        // No dummy data - show empty state
        setSectionData({
          section_id: sectionId || 'I',
          section_name: `Section ${sectionId}`,
          device_count: 0,
          devices: []
        });
      }
    } catch (error) {
      console.error('Error fetching section devices:', error);
      // No dummy data - show empty state
      setSectionData({
        section_id: sectionId || 'I',
        section_name: `Section ${sectionId}`,
        device_count: 0,
        devices: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDummySectionData = () => {
    // Determine number of devices per section (80 each, total 400)
    const devicesPerSection = 80;
    const sectionNumber = sectionId === 'I' ? 1 : sectionId === 'II' ? 2 : sectionId === 'III' ? 3 : sectionId === 'IV' ? 4 : 5;
    const startId = (sectionNumber - 1) * devicesPerSection + 1;

    const devices: Device[] = [];

    for (let i = 0; i < devicesPerSection; i++) {
      const deviceId = startId + i;
      const isActive = Math.random() > 0.15; // 85% online

      devices.push({
        id: deviceId,
        client_id: `SMS-${deviceId.toString().padStart(3, '0')}`,
        device_name: `Station ${deviceId}`,
        device_type: 'SMS',
        location: `Section ${sectionId} - Zone ${Math.floor(i / 10) + 1}`,
        latitude: 31.5 + (Math.random() - 0.5) * 0.1,
        longitude: 74.3 + (Math.random() - 0.5) * 0.1,
        section_id: sectionNumber,
        is_active: isActive,
        last_seen: isActive ? new Date(Date.now() - Math.random() * 3600000).toISOString() : new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
        latest_reading: isActive ? {
          timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
          temperature: 65 + Math.random() * 15,
          static_pressure: 45 + Math.random() * 10,
          differential_pressure: 2 + Math.random() * 1.5,
          volume: 100 + Math.random() * 50,
          total_volume_flow: 450 + Math.random() * 150,
          battery: 60 + Math.random() * 40
        } : null
      });
    }

    const dummySection: SectionData = {
      section_id: sectionId || 'I',
      section_name: `Section ${sectionId} - ${
        sectionId === 'I' ? 'Multan/BWP/Sahiwal' :
        sectionId === 'II' ? 'Faisalabad Region' :
        sectionId === 'III' ? 'Gujranwala Region' :
        sectionId === 'IV' ? 'Lahore Region' :
        'Sheikhupura Region'
      }`,
      device_count: devicesPerSection,
      devices: devices
    };

    setSectionData(dummySection);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  // Function to check if device has alarms
  const hasAlarms = (device: Device) => {
    return false; // Set to false for now - no active alarms shown
  };

  // Toggle device observation
  const toggleObservation = (device: Device, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click navigation

    const saved = localStorage.getItem('observed_devices');
    let devices = [];

    try {
      devices = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing observed devices:', e);
      devices = [];
    }

    const isObserved = devices.some((d: any) => d.id === device.id);

    if (isObserved) {
      // Remove from observation
      devices = devices.filter((d: any) => d.id !== device.id);
      setObservedDevices(prev => prev.filter(id => id !== device.id));
    } else {
      // Add to observation
      const deviceToSave = {
        id: device.id,
        section_id: sectionId,
        client_id: device.client_id,
        device_name: device.device_name,
        location: device.location,
        is_active: device.is_active,
        temperature: device.latest_reading?.temperature,
        static_pressure: device.latest_reading?.static_pressure,
        differential_pressure: device.latest_reading?.differential_pressure,
        battery: device.latest_reading?.battery
      };
      devices.push(deviceToSave);
      setObservedDevices(prev => [...prev, device.id]);
    }

    localStorage.setItem('observed_devices', JSON.stringify(devices));
  };

  const isDeviceObserved = (deviceId: number) => {
    return observedDevices.includes(deviceId);
  };

  // Calculate statistics
  const activeDevices = sectionData?.devices.filter(d => d.is_active).length || 0;
  const offlineDevices = (sectionData?.device_count || 0) - activeDevices;
  const devicesWithAlarms = sectionData?.devices.filter(d => hasAlarms(d)).length || 0;
  const totalFlow = sectionData?.devices.reduce((sum, d) => sum + (d.latest_reading?.total_volume_flow || 0), 0) || 0;

  // Filter devices based on alarms toggle
  const displayedDevices = showAlarmsOnly
    ? sectionData?.devices.filter(d => hasAlarms(d)) || []
    : sectionData?.devices || [];

  // Fetch and aggregate historical flow data for all devices in the section
  const generateFlowHistory = async () => {
    if (!sectionData?.devices || sectionData.devices.length === 0) {
      setFlowHistoryData([]);
      return;
    }

    setFlowLoading(true);
    try {
      // Fetch readings for all devices in this section in a single API call
      const response = await fetch(`/api/analytics/readings?section_id=${sectionData.section_id}&page_size=1000&page=1`);
      const result = response.ok ? await response.json() : { data: [] };
      const allReadings = result.data || [];

      if (allReadings.length === 0) {
        setFlowHistoryData([]);
        return;
      }

      // Group readings by BOTH device_id AND hour to prevent double-counting
      // Key: "deviceId-year-month-day-hour"
      const deviceHourlyData = new Map<string, any>();

      allReadings.forEach((reading: any) => {
        const timestamp = new Date(reading.timestamp);
        const hourKey = `${reading.device_id}-${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;

        // Keep only the LATEST reading for each device per hour
        if (!deviceHourlyData.has(hourKey)) {
          deviceHourlyData.set(hourKey, reading);
        } else {
          const existing = deviceHourlyData.get(hourKey);
          if (new Date(reading.timestamp) > new Date(existing.timestamp)) {
            deviceHourlyData.set(hourKey, reading);
          }
        }
      });

      // Now group by hour only and sum the latest reading from each device
      const hourlyData = new Map<string, { time: Date; totalFlow: number; deviceCount: number; deviceIds: Set<number> }>();

      deviceHourlyData.forEach((reading: any) => {
        const timestamp = new Date(reading.timestamp);
        const hourKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;

        if (!hourlyData.has(hourKey)) {
          hourlyData.set(hourKey, { time: timestamp, totalFlow: 0, deviceCount: 0, deviceIds: new Set() });
        }

        const entry = hourlyData.get(hourKey)!;
        entry.totalFlow += (reading.total_volume_flow || 0);
        entry.deviceCount += 1;
        entry.deviceIds.add(reading.device_id);
      });

      // Convert to array and sort by time
      const flowData = Array.from(hourlyData.values())
        .sort((a, b) => a.time.getTime() - b.time.getTime())
        .slice(-24) // Last 24 hours
        .map(entry => ({
          time: entry.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          flow: parseFloat(entry.totalFlow.toFixed(2)),
          timestamp: entry.time
        }));

      setFlowHistoryData(flowData);

    } catch (error) {
      console.error('[SectionDetail] Error fetching flow history:', error);
      setFlowHistoryData([]);
    } finally {
      setFlowLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading section data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/sections')}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Gauge className="w-8 h-8" />
                  {sectionData?.section_name}
                </h1>
                <p className="text-gray-400 mt-2">
                  {sectionData?.device_count || 0} SMS Devices
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Download className="w-5 h-5" />
              <span>Export Section Data</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Devices */}
          <div className="bg-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Gauge className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{sectionData?.device_count || 0}</div>
                <div className="text-xs text-gray-600">Total Devices</div>
              </div>
            </div>
          </div>

          {/* Online Devices */}
          <div className="bg-green-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{activeDevices}</div>
                <div className="text-xs text-gray-600">Online</div>
              </div>
            </div>
          </div>

          {/* Offline Devices */}
          <div className="bg-red-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
                <div className="text-xs text-gray-600">Offline</div>
              </div>
            </div>
          </div>

          {/* Devices with Alarms */}
          <div
            className="bg-yellow-100 rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowAlarmsOnly(!showAlarmsOnly)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{devicesWithAlarms}</div>
                <div className="text-xs text-gray-600">
                  {showAlarmsOnly ? 'Showing Alarms' : 'With Alarms'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Flow Card */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Volume Flow</div>
              <div className="text-4xl font-bold text-cyan-400">{totalFlow.toFixed(2)}</div>
              <div className="text-sm text-gray-400">MCF/day</div>
            </div>
          </div>
        </div>

        {/* Flow History Graph */}
        <div className="glass rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Section Total Volume Flow (Last 24 Hours)
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Sum of all device flows in {sectionData?.section_name}
            </p>
          </div>

          <div style={{ height: '300px' }}>
            {flowLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mb-3"></div>
                  <p className="text-gray-400">Loading flow data...</p>
                </div>
              </div>
            ) : flowHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={flowHistoryData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    label={{
                      value: 'Flow (MCF/day)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#9ca3af',
                      fontSize: 12
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any) => [value.toFixed(2) + ' MCF/day', 'Total Flow']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="flow"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400">Collecting flow data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Devices Table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '400px' }}>
            <table className="w-full min-w-[1200px] border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
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
                      <TrendingUp className="w-3 h-3 text-red-600" />
                      Max P (PSI)
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600 transform rotate-180" />
                      Min P (PSI)
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
                      <Droplets className="w-3 h-3" />
                      Volume (MCF)
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Flow (MCF/d)
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Battery className="w-3 h-3" />
                      Battery
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Reading</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Alarms</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayedDevices.map((device, index) => {
                  const deviceHasAlarms = hasAlarms(device);
                  const batteryVoltage = device.latest_reading?.battery || 0;
                  const getBatteryColor = (voltage: number) => {
                    // 4-color battery threshold system based on voltage
                    if (voltage === 0) return 'text-gray-500';
                    if (voltage < 10) return 'text-red-600';        // Red: Very Low (< 10V)
                    if (voltage < 10.5) return 'text-red-400';      // Light Red: Low (10-10.5V)
                    if (voltage <= 14) return 'text-green-400';     // Green: Normal (10.5-14V)
                    return 'text-yellow-400';                       // Yellow: High (> 14V)
                  };

                  return (
                    <tr
                      key={device.id}
                      onClick={() => navigate(`/stations/${device.id}`)}
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
                          {device.latest_reading?.temperature?.toFixed(1) || '-'}
                        </span>
                      </td>

                      {/* Static Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.latest_reading?.static_pressure?.toFixed(1) || '-'}
                        </span>
                      </td>

                      {/* Max Static Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-red-600">
                          {device.latest_reading?.max_static_pressure != null
                            ? device.latest_reading.max_static_pressure.toFixed(1)
                            : '-'}
                        </span>
                      </td>

                      {/* Min Static Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          {device.latest_reading?.min_static_pressure != null
                            ? device.latest_reading.min_static_pressure.toFixed(1)
                            : '-'}
                        </span>
                      </td>

                      {/* Differential Pressure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.latest_reading?.differential_pressure?.toFixed(1) || '-'}
                        </span>
                      </td>

                      {/* Volume (MCF) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {device.latest_reading?.volume?.toFixed(1) || '-'}
                        </span>
                      </td>

                      {/* Total Volume Flow */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-cyan-700">
                          {device.latest_reading?.total_volume_flow?.toFixed(1) || '-'}
                        </span>
                      </td>

                      {/* Battery */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Battery className={`w-4 h-4 ${getBatteryColor(batteryVoltage)}`} />
                          <span className={`text-sm font-medium ${getBatteryColor(batteryVoltage)}`}>
                            {batteryVoltage > 0 ? `${batteryVoltage.toFixed(2)}V` : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Last Reading */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          {device.latest_reading?.timestamp
                            ? formatTimestamp(device.latest_reading.timestamp)
                            : 'No data'}
                        </div>
                      </td>

                      {/* Alarms */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deviceHasAlarms ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <AlertTriangle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => toggleObservation(device, e)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isDeviceObserved(device.id)
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={isDeviceObserved(device.id) ? 'Remove from observation' : 'Add to observation'}
                        >
                          {isDeviceObserved(device.id) ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Observing</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Observe</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {displayedDevices.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            {showAlarmsOnly ? (
              <>
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Active Alarms
                </h3>
                <p className="text-gray-400">
                  All devices in this section are operating normally.
                </p>
                <button
                  onClick={() => setShowAlarmsOnly(false)}
                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Show All Devices
                </button>
              </>
            ) : (
              <>
                <Gauge className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No devices found
                </h3>
                <p className="text-gray-400">
                  This section doesn't have any SMS devices yet.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sectionId={sectionId}
        exportType="section"
      />
    </Layout>
  );
};

export default SectionDetail;
