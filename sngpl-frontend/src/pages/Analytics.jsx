import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedParameter, setSelectedParameter] = useState('temperature');
  const [timeRange, setTimeRange] = useState('7d'); // Default to 7 days
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      fetchAnalyticsData();
    }
  }, [selectedDevice, selectedParameter, timeRange, devices]);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Calculate date range for 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const params = {
        page: 1,
        page_size: 1000,  // Backend max is 1000
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      };

      if (selectedDevice !== 'all') {
        params.device_id = selectedDevice;
      }

      // Fetch first page to get total count
      const firstResponse = await api.get('/analytics/readings', { params });
      const total = firstResponse.data?.total || 0;
      const totalPages = firstResponse.data?.total_pages || 1;

      let allReadings = Array.isArray(firstResponse.data?.data) ? firstResponse.data.data : [];

      // Fetch remaining pages if there are more (limit to 10 pages = 10,000 records max)
      if (totalPages > 1) {
        const pagesToFetch = Math.min(totalPages - 1, 9); // Fetch up to 9 more pages
        const pagePromises = [];

        for (let page = 2; page <= pagesToFetch + 1; page++) {
          pagePromises.push(
            api.get('/analytics/readings', { params: { ...params, page } })
          );
        }

        const pageResponses = await Promise.all(pagePromises);
        pageResponses.forEach(response => {
          if (Array.isArray(response.data?.data)) {
            allReadings = allReadings.concat(response.data.data);
          }
        });
      }

      const readings = allReadings;

      // Process data for charts
      const chartData = readings.map(r => ({
        time: new Date(r.timestamp).toLocaleString(),
        timestamp: r.timestamp,
        temperature: r.temperature || 0,
        static_pressure: r.static_pressure || 0,
        differential_pressure: r.differential_pressure || 0,
        volume: r.volume || 0,
        total_volume_flow: r.total_volume_flow || 0,
        device: r.client_id || 'Unknown'
      }));

      setAnalyticsData(chartData);

      // Calculate statistics
      if (readings.length > 0) {
        const paramValues = readings.map(r => r[selectedParameter] || 0);
        const stats = {
          min: Math.min(...paramValues).toFixed(2),
          max: Math.max(...paramValues).toFixed(2),
          avg: (paramValues.reduce((a, b) => a + b, 0) / paramValues.length).toFixed(2),
          count: readings.length
        };
        setStatistics(stats);
      } else {
        setStatistics(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to fetch analytics data');
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      toast.loading('Exporting data...');

      let startDate, endDate;

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        endDate = new Date().toISOString();
        const start = new Date();

        switch (timeRange) {
          case '1h':
            start.setHours(start.getHours() - 1);
            break;
          case '24h':
            start.setHours(start.getHours() - 24);
            break;
          case '7d':
            start.setDate(start.getDate() - 7);
            break;
          case '30d':
            start.setDate(start.getDate() - 30);
            break;
          default:
            start.setHours(start.getHours() - 24);
        }

        startDate = start.toISOString();
      }

      const params = {
        start_date: startDate,
        end_date: endDate,
        format: exportFormat
      };

      if (selectedDevice !== 'all') {
        params.device_id = selectedDevice;
      }

      const response = await api.get('/analytics/export', {
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${Date.now()}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.dismiss();
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.dismiss();
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const parameterOptions = [
    { value: 'temperature', label: 'Temperature (°C)' },
    { value: 'static_pressure', label: 'Static Pressure' },
    { value: 'differential_pressure', label: 'Differential Pressure' },
    { value: 'volume', label: 'Volume (MCF)' },
    { value: 'total_volume_flow', label: 'Total Volume Flow (MCF/day)' }
  ];

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Historical data analysis and insights</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
            </select>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Export Data</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Device Selection */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Devices</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.device_name} ({device.client_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Parameter Selection */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Parameter</label>
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
              >
                {parameterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                onClick={fetchAnalyticsData}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {timeRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">End Date</label>
                <input
                  type="datetime-local"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass rounded-xl p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Minimum Value</p>
              <p className="text-3xl font-bold text-blue-400">{statistics.min}</p>
            </div>
            <div className="glass rounded-xl p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Maximum Value</p>
              <p className="text-3xl font-bold text-red-400">{statistics.max}</p>
            </div>
            <div className="glass rounded-xl p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Average Value</p>
              <p className="text-3xl font-bold text-green-400">{statistics.avg}</p>
            </div>
            <div className="glass rounded-xl p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Data Points</p>
              <p className="text-3xl font-bold text-purple-400">{statistics.count}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {loading ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
          </div>
        ) : analyticsData.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Available</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select different filters or wait for devices to send data
            </p>
            <p className="text-sm text-gray-500 mt-4">
              {devices.length} device(s) configured
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Line Chart */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {parameterOptions.find(p => p.value === selectedParameter)?.label} Trend
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorParam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey={selectedParameter}
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorParam)"
                    name={parameterOptions.find(p => p.value === selectedParameter)?.label}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart - Device Comparison */}
            {selectedDevice === 'all' && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Device Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="device" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey={selectedParameter} fill="#10B981" name={parameterOptions.find(p => p.value === selectedParameter)?.label} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Multi-Parameter Line Chart */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">All Parameters Overview</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.slice(-50)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="temperature" stroke="#F59E0B" name="Temperature" />
                  <Line type="monotone" dataKey="static_pressure" stroke="#10B981" name="Static Pressure" />
                  <Line type="monotone" dataKey="differential_pressure" stroke="#3B82F6" name="Diff. Pressure" />
                  <Line type="monotone" dataKey="volume" stroke="#8B5CF6" name="Volume (MCF)" />
                  <Line type="monotone" dataKey="total_volume_flow" stroke="#EC4899" name="Total Flow (MCF/day)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
