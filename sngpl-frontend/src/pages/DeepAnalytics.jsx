import { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  Settings,
  X,
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  EyeOff,
  Filter,
  Search,
  Download
} from 'lucide-react';
import Layout from '../components/Layout';
import { getDevices } from '../services/api';
import api from '../services/api';

const DeepAnalytics = () => {
  const navigate = useNavigate();
  const graphRef = useRef();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [deviceReadings, setDeviceReadings] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [viewMode, setViewMode] = useState('network'); // 'network' or 'grid'
  const [filterSeverity, setFilterSeverity] = useState('all'); // 'all', 'critical', 'warning'
  const [filterSection, setFilterSection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });

  const [thresholds, setThresholds] = useState({
    temperature: { min: 20, max: 100 },
    static_pressure: { min: 30, max: 120 },
    differential_pressure: { min: 0, max: 300 },
    volume: { min: 3000, max: 25000 },
    total_volume_flow: { min: 5000, max: 40000 }
  });

  // Fetch devices and their latest readings
  useEffect(() => {
    fetchDevicesAndReadings();
    const interval = setInterval(fetchDevicesAndReadings, 10000);
    return () => clearInterval(interval);
  }, []);

  // Build graph when devices change
  useEffect(() => {
    if (devices.length > 0) {
      buildNetworkGraph();
    }
  }, [devices, deviceReadings, thresholds, filterSection, filterSeverity]);

  // Update graph dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('graph-container');
      if (container) {
        setGraphDimensions({
          width: container.offsetWidth,
          height: container.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [viewMode]);

  const fetchDevicesAndReadings = async () => {
    try {
      const devicesData = await getDevices();
      setDevices(devicesData);

      const readings = {};
      await Promise.all(
        devicesData.map(async (device) => {
          try {
            const response = await api.get(`/analytics/readings?device_id=${device.id}&page_size=1&page=1`);
            if (response.data && response.data.data && response.data.data.length > 0) {
              readings[device.id] = response.data.data[0];
            }
          } catch (err) {
            console.error(`Error fetching data for device ${device.id}:`, err);
          }
        })
      );
      setDeviceReadings(readings);
      checkAlerts(devicesData, readings);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const checkAlerts = (devicesData, readings) => {
    const newAlerts = [];

    devicesData.forEach(device => {
      const reading = readings[device.id];
      if (!reading) return;

      Object.keys(thresholds).forEach(param => {
        const value = reading[param];
        const threshold = thresholds[param];

        if (value !== null && value !== undefined) {
          if (value < threshold.min) {
            newAlerts.push({
              device_id: device.id,
              device_name: device.device_name,
              client_id: device.client_id,
              parameter: param,
              value: value,
              threshold_type: 'min',
              threshold_value: threshold.min,
              severity: value < threshold.min * 0.8 ? 'critical' : 'warning',
              message: `${formatParameterName(param)} is below minimum threshold`,
              timestamp: reading.timestamp
            });
          } else if (value > threshold.max) {
            newAlerts.push({
              device_id: device.id,
              device_name: device.device_name,
              client_id: device.client_id,
              parameter: param,
              value: value,
              threshold_type: 'max',
              threshold_value: threshold.max,
              severity: value > threshold.max * 1.2 ? 'critical' : 'warning',
              message: `${formatParameterName(param)} is above maximum threshold`,
              timestamp: reading.timestamp
            });
          }
        }
      });
    });

    setAlerts(newAlerts);
  };

  const buildNetworkGraph = () => {
    const nodes = [];
    const links = [];

    // Central hub
    nodes.push({
      id: 'hub',
      name: 'SNGPL Network',
      type: 'hub',
      val: 25,
      color: '#3b82f6'
    });

    // Group by section
    const sections = {};
    let filteredDevices = devices;

    // Apply filters
    if (filterSection !== 'all') {
      filteredDevices = devices.filter(d => {
        if (d.client_id.startsWith('SMS-')) {
          const parts = d.client_id.split('-');
          return parts.length >= 2 && parts[1] === filterSection;
        }
        return filterSection === 'OTHER' && !d.client_id.startsWith('SMS-');
      });
    }

    filteredDevices.forEach(device => {
      const reading = deviceReadings[device.id];
      const deviceAlerts = alerts.filter(a => a.device_id === device.id);

      let status = 'healthy';
      let color = '#10b981';

      if (deviceAlerts.some(a => a.severity === 'critical')) {
        status = 'critical';
        color = '#ef4444';
      } else if (deviceAlerts.some(a => a.severity === 'warning')) {
        status = 'warning';
        color = '#f59e0b';
      } else if (!device.is_active || !reading) {
        status = 'offline';
        color = '#6b7280';
      }

      // Filter by severity
      if (filterSeverity !== 'all') {
        if (filterSeverity === 'critical' && status !== 'critical') return;
        if (filterSeverity === 'warning' && status !== 'warning') return;
      }

      let section = 'OTHER';
      if (device.client_id.startsWith('SMS-')) {
        const parts = device.client_id.split('-');
        if (parts.length >= 2) section = parts[1];
      }

      if (!sections[section]) {
        sections[section] = {
          id: `section-${section}`,
          name: `Section ${section}`,
          type: 'section',
          val: 15,
          color: '#6366f1'
        };
      }

      nodes.push({
        id: device.id.toString(),
        name: device.device_name,
        client_id: device.client_id,
        type: 'device',
        status: status,
        section: section,
        val: deviceAlerts.length > 0 ? 10 : 6,
        color: color,
        alerts: deviceAlerts.length,
        device: device,
        reading: reading
      });
    });

    Object.values(sections).forEach(section => {
      nodes.push(section);
      links.push({
        source: 'hub',
        target: section.id,
        distance: 120
      });
    });

    filteredDevices.forEach(device => {
      let section = 'OTHER';
      if (device.client_id.startsWith('SMS-')) {
        const parts = device.client_id.split('-');
        if (parts.length >= 2) section = parts[1];
      }

      links.push({
        source: `section-${section}`,
        target: device.id.toString(),
        distance: 60,
        color: nodes.find(n => n.id === device.id.toString())?.color
      });
    });

    setGraphData({ nodes, links });
  };

  const formatParameterName = (param) => {
    const names = {
      temperature: 'Temperature',
      static_pressure: 'Static Pressure',
      differential_pressure: 'Differential Pressure',
      volume: 'Volume',
      total_volume_flow: 'Total Volume Flow'
    };
    return names[param] || param;
  };

  const getParameterUnit = (param) => {
    const units = {
      temperature: '°F',
      static_pressure: 'PSI',
      differential_pressure: 'IWC',
      volume: 'MCF',
      total_volume_flow: 'MCF/day'
    };
    return units[param] || '';
  };

  const handleNodeClick = useCallback((node) => {
    if (node.type === 'device') {
      setSelectedDevice(node);
    }
  }, []);

  const handleThresholdUpdate = (param, type, value) => {
    setThresholds(prev => ({
      ...prev,
      [param]: {
        ...prev[param],
        [type]: parseFloat(value)
      }
    }));
  };

  const saveThresholds = () => {
    checkAlerts(devices, deviceReadings);
    setShowThresholdModal(false);
  };

  const exportData = () => {
    const data = alerts.map(alert => ({
      device: alert.device_name,
      client_id: alert.client_id,
      parameter: alert.parameter,
      value: alert.value,
      threshold: alert.threshold_value,
      severity: alert.severity,
      timestamp: alert.timestamp
    }));

    const csv = [
      ['Device', 'Client ID', 'Parameter', 'Value', 'Threshold', 'Severity', 'Timestamp'],
      ...data.map(row => [
        row.device,
        row.client_id,
        row.parameter,
        row.value,
        row.threshold,
        row.severity,
        row.timestamp
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts_${new Date().toISOString()}.csv`;
    a.click();
  };

  // Summary stats
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.is_active).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  const healthyDevices = devices.filter(d => {
    const deviceAlerts = alerts.filter(a => a.device_id === d.id);
    return deviceAlerts.length === 0 && d.is_active;
  }).length;

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (searchQuery && !alert.device_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.client_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sections = ['I', 'II', 'III', 'IV', 'V', 'OTHER'];

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-600" />
              Deep Analytics & Health Monitor
            </h1>
            <p className="text-gray-600 mt-1">Real-time network health visualization with intelligent alerting</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowThresholdModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <Settings className="w-4 h-4" />
              Thresholds
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass p-4 rounded-xl hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Devices</span>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalDevices}</div>
            <div className="text-xs text-gray-500 mt-1">{activeDevices} active</div>
          </div>

          <div className="glass p-4 rounded-xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setFilterSeverity('all')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Healthy</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{healthyDevices}</div>
            <div className="text-xs text-gray-500 mt-1">{((healthyDevices / totalDevices) * 100).toFixed(1)}%</div>
          </div>

          <div className="glass p-4 rounded-xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setFilterSeverity('warning')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Warnings</span>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-600">{warningAlerts}</div>
            <div className="text-xs text-gray-500 mt-1">Requires attention</div>
          </div>

          <div className="glass p-4 rounded-xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setFilterSeverity('critical')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Critical</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-red-600">{criticalAlerts}</div>
            <div className="text-xs text-gray-500 mt-1">Urgent action needed</div>
          </div>

          <div className="glass p-4 rounded-xl hover:scale-105 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Offline</span>
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-gray-600">{totalDevices - activeDevices}</div>
            <div className="text-xs text-gray-500 mt-1">No recent data</div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('network')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'network'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Network View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                List View
              </button>
            </div>

            {/* Section Filter */}
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sections</option>
              {sections.map(s => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>

            {/* Labels Toggle */}
            {viewMode === 'network' && (
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Labels
              </button>
            )}

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visualization Panel */}
          <div className={`${viewMode === 'network' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="glass rounded-xl p-6 h-[700px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewMode === 'network' ? 'Network Health Map' : 'Device Health List'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  Live Updates
                </div>
              </div>

              {viewMode === 'network' ? (
                <div id="graph-container" className="flex-1 bg-slate-950 rounded-lg relative overflow-hidden">
                  {graphData.nodes.length > 0 && (
                    <ForceGraph2D
                      ref={graphRef}
                      graphData={graphData}
                      width={graphDimensions.width}
                      height={graphDimensions.height - 100}
                      backgroundColor="#020617"
                      nodeLabel={node => showLabels ? node.name : ''}
                      nodeColor="color"
                      nodeVal="val"
                      nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = node.type === 'hub' ? 14 / globalScale : node.type === 'section' ? 12 / globalScale : 10 / globalScale;

                        // Draw node
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);

                        // Gradient for hub
                        if (node.type === 'hub') {
                          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.val);
                          gradient.addColorStop(0, node.color);
                          gradient.addColorStop(1, '#1e40af');
                          ctx.fillStyle = gradient;
                        } else {
                          ctx.fillStyle = node.color;
                        }

                        ctx.fill();

                        // Glow for alerts
                        if (node.alerts > 0) {
                          ctx.shadowBlur = 20;
                          ctx.shadowColor = node.color;
                          ctx.fill();
                          ctx.shadowBlur = 0;
                        }

                        // Border
                        ctx.strokeStyle = node.type === 'hub' ? '#60a5fa' : '#ffffff';
                        ctx.lineWidth = node.type === 'hub' ? 3 : 2;
                        ctx.stroke();

                        // Label
                        if (showLabels) {
                          ctx.font = `${fontSize}px Inter, sans-serif`;
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'middle';
                          ctx.fillStyle = '#ffffff';
                          ctx.fillText(
                            node.type === 'device' ? node.client_id : label,
                            node.x,
                            node.y + node.val + 15
                          );
                        }

                        // Alert badge
                        if (node.alerts > 0) {
                          const badgeRadius = 8;
                          ctx.beginPath();
                          ctx.arc(node.x + node.val - 2, node.y - node.val + 2, badgeRadius, 0, 2 * Math.PI);
                          ctx.fillStyle = '#ef4444';
                          ctx.fill();
                          ctx.strokeStyle = '#ffffff';
                          ctx.lineWidth = 2;
                          ctx.stroke();

                          ctx.fillStyle = '#ffffff';
                          ctx.font = '10px Inter, sans-serif';
                          ctx.textAlign = 'center';
                          ctx.fillText(node.alerts, node.x + node.val - 2, node.y - node.val + 3);
                        }
                      }}
                      linkColor={link => link.color || '#4b5563'}
                      linkWidth={2}
                      linkDirectionalParticles={1}
                      linkDirectionalParticleWidth={3}
                      linkDirectionalParticleSpeed={0.005}
                      onNodeClick={handleNodeClick}
                      enableNodeDrag={true}
                      cooldownTime={2000}
                      d3VelocityDecay={0.4}
                    />
                  )}

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm p-3 rounded-lg">
                    <div className="text-white text-xs font-semibold mb-2">Health Status</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-white text-xs">Healthy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-white text-xs">Warning</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-white text-xs">Critical</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-white text-xs">Offline</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {graphData.nodes.filter(n => n.type === 'device').map(node => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedDevice(node)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                          node.status === 'critical' ? 'bg-red-50 border-red-300 hover:border-red-500' :
                          node.status === 'warning' ? 'bg-orange-50 border-orange-300 hover:border-orange-500' :
                          node.status === 'healthy' ? 'bg-green-50 border-green-300 hover:border-green-500' :
                          'bg-gray-50 border-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${
                              node.status === 'critical' ? 'bg-red-500' :
                              node.status === 'warning' ? 'bg-orange-500' :
                              node.status === 'healthy' ? 'bg-green-500' : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <div className="font-semibold text-gray-900">{node.name}</div>
                              <div className="text-sm text-gray-600">{node.client_id}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {node.alerts > 0 && (
                              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                                {node.alerts} Alert{node.alerts > 1 ? 's' : ''}
                              </span>
                            )}
                            <span className="text-gray-400">→</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Panel */}
          {viewMode === 'network' && (
            <div className="glass rounded-xl p-6 h-[700px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-600" />
                  Active Alerts
                </h2>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {filteredAlerts.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-3" />
                    <p className="text-gray-600 font-medium">All Systems Normal</p>
                    <p className="text-gray-500 text-sm mt-1">No alerts detected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAlerts
                      .sort((a, b) => {
                        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
                        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
                        return 0;
                      })
                      .map((alert, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                            alert.severity === 'critical'
                              ? 'bg-red-50 border-red-500 hover:bg-red-100'
                              : 'bg-orange-50 border-orange-500 hover:bg-orange-100'
                          }`}
                          onClick={() => {
                            const node = graphData.nodes.find(n => n.id === alert.device_id.toString());
                            if (node) setSelectedDevice(node);
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                                alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm truncate">{alert.device_name}</div>
                                <div className="text-xs text-gray-600">{alert.client_id}</div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                              alert.severity === 'critical'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-orange-200 text-orange-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {formatParameterName(alert.parameter)}:
                              <span className="font-semibold ml-1">{alert.value.toFixed(2)}</span>
                              {' '}{getParameterUnit(alert.parameter)}
                            </span>
                            {alert.threshold_type === 'max' ? (
                              <TrendingUp className="w-3 h-3 text-red-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Device Detail Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedDevice.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedDevice.client_id}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      selectedDevice.status === 'healthy' ? 'bg-green-100' :
                      selectedDevice.status === 'warning' ? 'bg-orange-100' :
                      selectedDevice.status === 'critical' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        selectedDevice.status === 'healthy' ? 'bg-green-500 animate-pulse' :
                        selectedDevice.status === 'warning' ? 'bg-orange-500 animate-pulse' :
                        selectedDevice.status === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{selectedDevice.status}</span>
                    </div>
                    {selectedDevice.alerts > 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                        {selectedDevice.alerts} Active Alert{selectedDevice.alerts > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedDevice.reading && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Readings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {Object.keys(thresholds).map(param => {
                      const value = selectedDevice.reading[param];
                      const threshold = thresholds[param];
                      const isOutOfRange = value < threshold.min || value > threshold.max;
                      const percentage = ((value - threshold.min) / (threshold.max - threshold.min)) * 100;

                      return (
                        <div key={param} className={`p-4 rounded-lg ${
                          isOutOfRange ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50 border-2 border-gray-200'
                        }`}>
                          <div className="text-xs text-gray-600 mb-1">{formatParameterName(param)}</div>
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {value?.toFixed(2) || 'N/A'}
                            <span className="text-sm text-gray-500 ml-1">{getParameterUnit(param)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                            <div
                              className={`h-1.5 rounded-full ${
                                isOutOfRange ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600">
                            Range: {threshold.min} - {threshold.max}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Alert Details ({selectedDevice.alerts})
                </h3>
                {selectedDevice.alerts === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="text-gray-600 font-medium">No Active Alerts</p>
                    <p className="text-gray-500 text-sm">All parameters within normal range</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts
                      .filter(a => a.device_id === parseInt(selectedDevice.id))
                      .map((alert, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${
                            alert.severity === 'critical'
                              ? 'bg-red-50 border-red-300'
                              : 'bg-orange-50 border-orange-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{formatParameterName(alert.parameter)}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              alert.severity === 'critical'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-orange-200 text-orange-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>
                              Value: <span className="font-semibold">{alert.value.toFixed(2)}</span> {getParameterUnit(alert.parameter)}
                            </span>
                            <span>
                              Threshold: <span className="font-semibold">{alert.threshold_value}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate(`/stations/${selectedDevice.id}`)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                View Full Device Details →
              </button>
            </div>
          </div>
        )}

        {/* Threshold Configuration Modal */}
        {showThresholdModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Configure Alert Thresholds</h2>
                <button
                  onClick={() => setShowThresholdModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Set minimum and maximum thresholds for each parameter. Alerts will be triggered when device readings exceed these limits.
              </p>

              <div className="space-y-4">
                {Object.keys(thresholds).map(param => (
                  <div key={param} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                      <span>{formatParameterName(param)}</span>
                      <span className="text-sm text-gray-500">({getParameterUnit(param)})</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Minimum Threshold</label>
                        <input
                          type="number"
                          value={thresholds[param].min}
                          onChange={(e) => handleThresholdUpdate(param, 'min', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-2 font-medium">Maximum Threshold</label>
                        <input
                          type="number"
                          value={thresholds[param].max}
                          onChange={(e) => handleThresholdUpdate(param, 'max', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={saveThresholds}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Save Thresholds
                </button>
                <button
                  onClick={() => setShowThresholdModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DeepAnalytics;
