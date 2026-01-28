import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  TrendingUp,
  Thermometer,
  Gauge,
  Zap,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull
} from 'lucide-react';

interface SectionStats {
  section_id: string;
  section_name: string;
  sms_count: number;
  active_sms: number;
  cumulative_volume_flow: number;
  unit: string;
}

interface DashboardData {
  sections: SectionStats[];
  all_sms: SectionStats;
  timestamp: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [wsConnected, setWsConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [historicalFlow, setHistoricalFlow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [dataStartTime, setDataStartTime] = useState<Date>(new Date());
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [selectedSection, setSelectedSection] = useState('all');
  const [batteryData, setBatteryData] = useState<any[]>([]);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [selectedAlertParameter, setSelectedAlertParameter] = useState('all');
  const [selectedAlertSeverity, setSelectedAlertSeverity] = useState('all');
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Generate initial historical flow data
    generateInitialHistoricalData();

    fetchDashboardData();
    connectWebSocket();
    generateBatteryData();
    generateAlertsData();

    // Delay chart rendering to avoid dimension errors (reduced for faster load)
    setTimeout(() => setChartsReady(true), 300);

    // Refresh data every 10 seconds for smooth updates
    const dataInterval = setInterval(() => {
      fetchDashboardData();
      generateBatteryData();
      generateAlertsData();
    }, 10000);

    return () => {
      clearInterval(dataInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const generateInitialHistoricalData = () => {
    // Generate last 50 data points (simulate ~12 minutes of data at 15s intervals)
    const initialData: any[] = [];
    const now = new Date();

    for (let i = 49; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 15000); // 15 seconds apart
      const baseFlow = 18000; // Base flow around 18000 MCF/day
      const variation = Math.sin(i / 10) * 3000 + Math.random() * 2000; // Add some variation
      const totalFlow = baseFlow + variation;

      initialData.push({
        timestamp: timestamp.toLocaleTimeString(),
        totalFlow: totalFlow,
        fullTimestamp: timestamp
      });
    }

    setHistoricalFlow(initialData);
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/sections/stats');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);

        // Add to historical flow data
        const newDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
          totalFlow: data.all_sms.cumulative_volume_flow,
          fullTimestamp: new Date()
        };

        setHistoricalFlow(prev => {
          const updated = [...prev, newDataPoint];
          // Keep last 100 data points (last ~25 minutes at 15s intervals)
          return updated.slice(-100);
        });
      } else {
        // Keep existing data if API fails (offline mode)
        console.warn('API returned error, keeping existing data');
        if (!dashboardData) {
          // Only generate dummy data on first load
          generateDummyDashboardData();
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data (possibly offline):', error);
      // Keep existing data when offline - don't replace with dummy data
      if (!dashboardData) {
        // Only generate dummy data on first load
        generateDummyDashboardData();
      }
    } finally {
      setLoading(false);
    }
  };

  const generateDummyDashboardData = () => {
    // Generate realistic dummy data for 400 devices across 5 sections
    const sections: SectionStats[] = [
      {
        section_id: 'I',
        section_name: 'Section I - Multan/BWP/Sahiwal',
        sms_count: 80,
        active_sms: Math.floor(60 + Math.random() * 15), // 60-75 active
        cumulative_volume_flow: 15000 + Math.random() * 8000, // 15000-23000 MCF/day
        unit: 'MCF/day'
      },
      {
        section_id: 'II',
        section_name: 'Section II - Faisalabad Region',
        sms_count: 80,
        active_sms: Math.floor(60 + Math.random() * 15),
        cumulative_volume_flow: 15000 + Math.random() * 8000,
        unit: 'MCF/day'
      },
      {
        section_id: 'III',
        section_name: 'Section III - Gujranwala Region',
        sms_count: 80,
        active_sms: Math.floor(60 + Math.random() * 15),
        cumulative_volume_flow: 15000 + Math.random() * 8000,
        unit: 'MCF/day'
      },
      {
        section_id: 'IV',
        section_name: 'Section IV - Lahore Region',
        sms_count: 80,
        active_sms: Math.floor(60 + Math.random() * 15),
        cumulative_volume_flow: 15000 + Math.random() * 8000,
        unit: 'MCF/day'
      },
      {
        section_id: 'V',
        section_name: 'Section V - Sheikhupura Region',
        sms_count: 80,
        active_sms: Math.floor(60 + Math.random() * 15),
        cumulative_volume_flow: 15000 + Math.random() * 8000,
        unit: 'MCF/day'
      }
    ];

    const totalActiveSms = sections.reduce((sum, s) => sum + s.active_sms, 0);
    const totalCumulativeFlow = sections.reduce((sum, s) => sum + s.cumulative_volume_flow, 0);

    const dummyData: DashboardData = {
      sections: sections,
      all_sms: {
        section_id: 'ALL',
        section_name: 'All SMS Devices',
        sms_count: 400,
        active_sms: totalActiveSms,
        cumulative_volume_flow: totalCumulativeFlow,
        unit: 'MCF/day'
      },
      timestamp: new Date().toISOString()
    };

    setDashboardData(dummyData);

    // Add to historical flow data
    const newDataPoint = {
      timestamp: new Date().toLocaleTimeString(),
      totalFlow: totalCumulativeFlow,
      fullTimestamp: new Date()
    };

    setHistoricalFlow(prev => {
      const updated = [...prev, newDataPoint];
      return updated.slice(-100);
    });
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        wsReconnectAttempts.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'reading_update') {
            // Trigger data refresh on new reading
            fetchDashboardData();
          } else if (message.type === 'alarm') {
            toast.error(
              `Alert: ${message.alarm.parameter} on ${message.client_id}`,
              { duration: 4000 }
            );
            setTotalAlerts(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);

        // Only retry if we haven't exceeded max attempts
        if (wsReconnectAttempts.current < maxReconnectAttempts) {
          wsReconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts.current), 30000); // Exponential backoff, max 30s
          setTimeout(connectWebSocket, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setWsConnected(false);
    }
  };

  const getAverageFlow = () => {
    if (historicalFlow.length === 0) return 0;
    const sum = historicalFlow.reduce((acc: number, d: any) => acc + d.totalFlow, 0);
    return sum / historicalFlow.length;
  };

  const getPeakFlow = () => {
    if (historicalFlow.length === 0) return dashboardData?.all_sms.cumulative_volume_flow || 0;
    return Math.max(...historicalFlow.map(d => d.totalFlow));
  };

  const getTotalAccumulated = () => {
    if (historicalFlow.length === 0) return 0;
    // Simple sum of all data points
    return historicalFlow.reduce((sum, d) => sum + d.totalFlow, 0);
  };

  const generateBatteryData = async () => {
    try {
      // Fetch real device data from API
      const response = await fetch('/api/devices/');
      if (response.ok) {
        const devices = await response.json();

        const data: any[] = devices.map((device: any) => {
          const batteryVoltage = device.latest_reading?.battery || 0;

          // Determine status based on voltage thresholds
          let status = 'good';
          if (batteryVoltage < 11.0) {
            status = 'low';    // < 11V is low
          } else if (batteryVoltage < 12.0) {
            status = 'medium'; // 11-12V is medium
          }
          // >= 12V is good

          return {
            deviceId: device.client_id,
            deviceName: device.device_name || device.client_id,
            section: device.section_id || 'N/A',
            battery: batteryVoltage,
            voltage: batteryVoltage,
            status: status,
            isActive: device.is_active || false
          };
        });

        // Sort: online devices first, then offline
        data.sort((a: any, b: any) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return 0;
        });

        setBatteryData(data);
      } else {
        console.warn('Failed to fetch battery data from API');
        setBatteryData([]);
      }
    } catch (error) {
      console.error('Error fetching battery data:', error);
      setBatteryData([]);
    }
  };

  const generateAlertsData = async () => {
    try {
      // Fetch real alarms and device names
      const [alarmsResponse, devicesResponse] = await Promise.all([
        api.get('/alarms/'),
        fetch('/api/devices/')
      ]);
      const alarms = alarmsResponse.data;

      // Build a lookup map: client_id -> device_name
      const deviceNameMap: { [key: string]: string } = {};
      if (devicesResponse.ok) {
        const devices = await devicesResponse.json();
        devices.forEach((d: any) => {
          deviceNameMap[d.client_id] = d.device_name || d.client_id;
        });
      }

        // Map alarms to alerts format
        const alerts: any[] = alarms.map((alarm: any) => {
          // Map parameter names to icons
          const paramIcons: { [key: string]: string } = {
            'temperature': '🌡️',
            'static_pressure': '📊',
            'differential_pressure': '⚡',
            'battery': '🔋',
            'volume': '📦',
            'total_volume_flow': '💧'
          };

          // Map parameter names to units
          const paramUnits: { [key: string]: string } = {
            'temperature': '°F',
            'static_pressure': 'PSI',
            'differential_pressure': 'IWC',
            'battery': 'V',
            'volume': 'MCF',
            'total_volume_flow': 'MCF/day'
          };

          // Map threshold conditions to severity levels
          let severityLevel = 'low';
          if (alarm.threshold_condition?.includes('critical') || alarm.threshold_condition?.includes('very high') || alarm.threshold_condition?.includes('very low')) {
            severityLevel = 'high';
          } else if (alarm.threshold_condition?.includes('high') || alarm.threshold_condition?.includes('low')) {
            severityLevel = 'medium';
          }

          return {
            deviceId: alarm.client_id,
            deviceName: deviceNameMap[alarm.client_id] || alarm.client_id,
            section: alarm.section_id || 'N/A',
            parameter: alarm.parameter.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            paramIcon: paramIcons[alarm.parameter] || '⚠️',
            unit: paramUnits[alarm.parameter] || '',
            value: alarm.value?.toFixed(1) || 'N/A',
            severity: severityLevel,
            threshold: alarm.threshold_condition || 'Alert',
            timestamp: new Date(alarm.timestamp)
          };
        });

      setAlertsData(alerts);
      setTotalAlerts(alerts.length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlertsData([]);
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 60) return <BatteryFull className="w-4 h-4" />;
    if (level > 30) return <BatteryMedium className="w-4 h-4" />;
    return <BatteryLow className="w-4 h-4" />;
  };

  const getBatteryColor = (voltage: number) => {
    // Color based on voltage thresholds
    if (voltage >= 12.0) return '#22c55e'; // Green - Good (>= 12V)
    if (voltage >= 11.0) return '#eab308'; // Yellow - Medium (11-12V)
    return '#ef4444'; // Red - Low (< 11V)
  };

  const getAlertColor = (severity: string) => {
    if (severity === 'low') return '#22c55e'; // Green
    if (severity === 'medium') return '#eab308'; // Yellow
    return '#ef4444'; // Red - high
  };

  const getAlertBgColor = (severity: string) => {
    if (severity === 'low') return 'bg-green-500/20 border-green-500/30';
    if (severity === 'medium') return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const filteredBatteryData = selectedSection === 'all'
    ? batteryData
    : batteryData.filter(d => d.section === selectedSection);

  const filteredAlertsData = alertsData.filter(alert => {
    const paramMatch = selectedAlertParameter === 'all' || alert.parameter === selectedAlertParameter;
    const severityMatch = selectedAlertSeverity === 'all' || alert.severity === selectedAlertSeverity;
    return paramMatch && severityMatch;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const onlineDevices = dashboardData?.all_sms.active_sms || 0;
  const totalDevices = dashboardData?.all_sms.sms_count || 400;
  const offlineDevices = totalDevices - onlineDevices;
  const currentFlow = dashboardData?.all_sms.cumulative_volume_flow || 0;

  return (
    <Layout>
      <div className="flex flex-col space-y-4 pb-8">
        {/* Top Stats Bar - Compact Single Row */}
        <div className="grid grid-cols-5 gap-3">
          {/* Total SMS */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-100 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-600 text-xs font-medium">Total SMS</span>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalDevices}</div>
            <div className="text-xs text-gray-600 mt-1">Devices</div>
          </motion.div>

          {/* Online */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-green-100 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-600 text-xs font-medium">Online</span>
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{onlineDevices}</div>
            <div className="text-xs text-gray-600 mt-1">{((onlineDevices / totalDevices) * 100).toFixed(1)}%</div>
          </motion.div>

          {/* Offline */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-red-100 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-600 text-xs font-medium">Offline</span>
              <WifiOff className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">{offlineDevices}</div>
            <div className="text-xs text-gray-600 mt-1">{((offlineDevices / totalDevices) * 100).toFixed(1)}%</div>
          </motion.div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-yellow-100 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-600 text-xs font-medium">Alerts</span>
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-yellow-600">{totalAlerts}</div>
            <div className="text-xs text-gray-600 mt-1">Active</div>
          </motion.div>

          {/* Duration Offline */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-red-100 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/offline-tracker')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-600 text-xs font-medium">Duration Offline</span>
              <div className="p-1 bg-red-100 rounded-md">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{offlineDevices}</div>
            <div className="text-xs text-gray-600 mt-1">Since {dataStartTime.toLocaleTimeString()}</div>
          </motion.div>
        </div>

        {/* Main Chart - Total Volume Flow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex-1 glass rounded-lg p-6"
        >
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Zap className="w-8 h-8 text-cyan-600" />
                Total Volume Flow
              </h2>
              <p className="text-gray-600 text-sm mt-1">Real-time aggregated gas flow monitoring</p>
            </div>
          </div>

          {/* Current Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <div className="text-xs text-cyan-700 mb-1">Current Flow</div>
              <div className="text-3xl font-bold text-cyan-600">{currentFlow.toFixed(1)}</div>
              <div className="text-xs text-cyan-600 mt-1">MCF/day</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-xs text-green-700 mb-1">Peak Flow</div>
              <div className="text-3xl font-bold text-green-600">{getPeakFlow().toFixed(1)}</div>
              <div className="text-xs text-green-600 mt-1">MCF/day</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-xs text-purple-700 mb-1">Average Flow</div>
              <div className="text-3xl font-bold text-purple-600">{getAverageFlow().toFixed(1)}</div>
              <div className="text-xs text-purple-600 mt-1">MCF/day</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-xs text-yellow-700 mb-1">Active Stations</div>
              <div className="text-3xl font-bold text-yellow-600">{onlineDevices}/{totalDevices}</div>
              <div className="text-xs text-yellow-600 mt-1">Online</div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 min-h-[192px]">
            {chartsReady && historicalFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                <AreaChart data={historicalFlow}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    domain={[0, 40000]}
                    label={{ value: 'MCF/day', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalFlow"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorFlow)"
                    name="Total Volume Flow (MCF/day)"
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
                  <p className="text-gray-600">Collecting data...</p>
                  <p className="text-sm text-gray-500 mt-2">Chart will populate in a few moments</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Bottom Section: Alerts Overview + Battery Visualization */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left: Active Alerts Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-red-800/30 to-orange-900/30 backdrop-blur-sm rounded-lg p-4 border border-red-500/30 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-semibold text-white">Active Alerts ({filteredAlertsData.length})</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-400">High: {filteredAlertsData.filter(a => a.severity === 'high').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-400">Med: {filteredAlertsData.filter(a => a.severity === 'medium').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-400">Low: {filteredAlertsData.filter(a => a.severity === 'low').length}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-2">
              <select
                value={selectedAlertParameter}
                onChange={(e) => setSelectedAlertParameter(e.target.value)}
                className="flex-1 bg-slate-700/50 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-red-500"
              >
                <option value="all">All Parameters</option>
                <option value="Temperature">🌡️ Temperature</option>
                <option value="Static Pressure">📊 Static Pressure</option>
                <option value="Diff. Pressure">⚡ Diff. Pressure</option>
                <option value="Battery">🔋 Battery</option>
                <option value="Volume">📦 Volume</option>
                <option value="Total Flow">💧 Total Flow</option>
              </select>
              <select
                value={selectedAlertSeverity}
                onChange={(e) => setSelectedAlertSeverity(e.target.value)}
                className="flex-1 bg-slate-700/50 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-red-500"
              >
                <option value="all">All Severities</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Alerts Scrollable List */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '220px' }}>
              <div className="space-y-2">
                {filteredAlertsData.slice(0, 50).map((alert, index) => (
                  <motion.div
                    key={`${alert.deviceId}-${alert.parameter}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className={`border rounded-lg p-2 ${getAlertBgColor(alert.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{alert.paramIcon}</span>
                        <div>
                          <div className="text-xs font-semibold text-white">{alert.deviceName}</div>
                          <div className="text-xs text-gray-400">{alert.parameter}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{alert.value} {alert.unit}</div>
                        <div className={`text-xs font-medium ${
                          alert.severity === 'high' ? 'text-red-400' :
                          alert.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {alert.threshold}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Battery Status Bar Chart - Individual Devices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-yellow-800/30 to-orange-900/30 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/30 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Battery className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-semibold text-white">SMS Battery Levels</h3>
              </div>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-slate-700/50 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-yellow-500"
              >
                <option value="all">All Sections (400)</option>
                <option value="I">Section I (80)</option>
                <option value="II">Section II (80)</option>
                <option value="III">Section III (80)</option>
                <option value="IV">Section IV (80)</option>
                <option value="V">Section V (80)</option>
              </select>
            </div>

            {/* Info */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Showing {filteredBatteryData.length} devices
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-green-500"></div>
                  <span className="text-xs text-gray-400">Good</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-yellow-500"></div>
                  <span className="text-xs text-gray-400">Med</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-red-500"></div>
                  <span className="text-xs text-gray-400">Low</span>
                </div>
              </div>
            </div>

            {/* Bar Chart - Horizontal Scroll Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ maxHeight: '260px', minHeight: '260px' }}>
              <div style={{ minWidth: `${Math.max(filteredBatteryData.length * 25, 100)}px`, height: '260px' }}>
                {chartsReady && <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                  <BarChart
                    data={filteredBatteryData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis
                      dataKey="deviceId"
                      stroke="#9ca3af"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      style={{ fontSize: '8px' }}
                    />
                    <YAxis
                      domain={[0, 15]}
                      stroke="#9ca3af"
                      style={{ fontSize: '10px' }}
                      label={{ value: 'Battery (V)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#1f2937',
                        fontSize: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => {
                        return [`${value.toFixed(2)}V`, 'Battery'];
                      }}
                      labelFormatter={(label) => {
                        const device = filteredBatteryData.find((d: any) => d.deviceId === label);
                        return device?.deviceName || label;
                      }}
                    />
                    <Bar dataKey="battery" radius={[4, 4, 0, 0]} maxBarSize={20}>
                      {filteredBatteryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBatteryColor(entry.battery)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
