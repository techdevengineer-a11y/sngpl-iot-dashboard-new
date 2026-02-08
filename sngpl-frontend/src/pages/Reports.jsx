import { useState, useEffect } from 'react';
import { getDevices, getAlarms } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Reports = () => {
  const [devices, setDevices] = useState([]);
  const [reportType, setReportType] = useState('device_performance');
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    toast.loading('Generating report...');

    try {
      let startDate, endDate;

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        endDate = new Date().toISOString();
        const start = new Date();

        switch (dateRange) {
          case '24h':
            start.setHours(start.getHours() - 24);
            break;
          case '7d':
            start.setDate(start.getDate() - 7);
            break;
          case '30d':
            start.setDate(start.getDate() - 30);
            break;
          case '90d':
            start.setDate(start.getDate() - 90);
            break;
          default:
            start.setDate(start.getDate() - 7);
        }

        startDate = start.toISOString();
      }

      // Fetch data based on report type
      let reportData = {};

      if (reportType === 'device_performance') {
        const params = { start_date: startDate, end_date: endDate };
        if (selectedDevice !== 'all') params.device_id = selectedDevice;

        const [readingsResponse, statsResponse] = await Promise.all([
          api.get('/analytics/readings', { params }),
          api.get('/devices/stats')
        ]);

        const readings = readingsResponse.data;

        reportData = {
          type: 'Device Performance Report',
          period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
          totalReadings: readings.length,
          avgTemperature: (readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length).toFixed(2),
          avgStaticPressure: (readings.reduce((sum, r) => sum + r.static_pressure, 0) / readings.length).toFixed(2),
          avgDiffPressure: (readings.reduce((sum, r) => sum + r.differential_pressure, 0) / readings.length).toFixed(2),
          avgVolume: (readings.reduce((sum, r) => sum + r.volume, 0) / readings.length).toFixed(2),
          avgFlow: (readings.reduce((sum, r) => sum + r.total_volume_flow, 0) / readings.length).toFixed(2),
          devicesAnalyzed: selectedDevice === 'all' ? devices.length : 1
        };
      } else if (reportType === 'alarm_summary') {
        const alarmsResponse = await getAlarms({ limit: 1000 });
        const alarms = alarmsResponse.filter(a => {
          const alarmDate = new Date(a.triggered_at);
          return alarmDate >= new Date(startDate) && alarmDate <= new Date(endDate);
        });

        reportData = {
          type: 'Alarm Summary Report',
          period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
          totalAlarms: alarms.length,
          criticalAlarms: alarms.filter(a => a.severity === 'critical').length,
          acknowledgedAlarms: alarms.filter(a => a.is_acknowledged).length,
          pendingAlarms: alarms.filter(a => !a.is_acknowledged).length,
          mostCommonParameter: getMostCommon(alarms.map(a => a.parameter)),
          devicesWithAlarms: new Set(alarms.map(a => a.client_id)).size
        };
      } else if (reportType === 'system_health') {
        const [healthResponse, statsResponse] = await Promise.all([
          api.get('/health'),
          api.get('/devices/stats')
        ]);

        reportData = {
          type: 'System Health Report',
          period: new Date().toLocaleDateString(),
          mqttStatus: healthResponse.data.mqtt_connected ? 'Connected' : 'Disconnected',
          totalDevices: statsResponse.data.total_devices,
          activeDevices: statsResponse.data.active_devices,
          inactiveDevices: statsResponse.data.inactive_devices,
          uptimePercentage: ((statsResponse.data.active_devices / statsResponse.data.total_devices) * 100).toFixed(1)
        };
      }

      setReportPreview(reportData);
      toast.dismiss();
      toast.success('Report generated successfully!');
      setGenerating(false);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate report');
      console.error('Error generating report:', error);
      setGenerating(false);
    }
  };

  const getMostCommon = (arr) => {
    if (arr.length === 0) return 'N/A';
    const counts = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const exportReport = async (format) => {
    if (!reportPreview) {
      toast.error('Please generate a report first');
      return;
    }

    toast.loading(`Exporting report as ${format.toUpperCase()}...`);

    try {
      let endpoint = '';
      let params = {};

      // Determine the endpoint and parameters based on report type
      if (reportType === 'device_performance') {
        endpoint = format === 'pdf' ? '/reports/devices/pdf' : '/reports/devices/excel';
        if (selectedDevice !== 'all') {
          params.device_id = selectedDevice;
        }
      } else if (reportType === 'alarm_summary') {
        endpoint = format === 'pdf' ? '/reports/alarms/pdf' : '/reports/alarms/excel';

        // Calculate days based on date range
        let days = 7;
        if (dateRange === '24h') days = 1;
        else if (dateRange === '7d') days = 7;
        else if (dateRange === '30d') days = 30;
        else if (dateRange === '90d') days = 90;

        params.days = days;
      } else {
        // For other report types, use devices or alarms export based on content
        endpoint = format === 'pdf' ? '/reports/devices/pdf' : '/reports/devices/excel';
      }

      // Make the API request with responseType blob for file download
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      // Create a download link and trigger download
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportPreview.type.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`Report exported successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to export report: ${error.response?.data?.detail || error.message}`);
      console.error('Export error:', error);
    }
  };

  const reportTypes = [
    { value: 'device_performance', label: 'Device Performance', icon: '📊', description: 'Detailed performance metrics for devices' },
    { value: 'alarm_summary', label: 'Alarm Summary', icon: '🔔', description: 'Overview of all alarms and their status' },
    { value: 'system_health', label: 'System Health', icon: '💚', description: 'Overall system status and uptime' },
    { value: 'data_quality', label: 'Data Quality', icon: '✅', description: 'Data completeness and accuracy' }
  ];

  const dateRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and export comprehensive system reports</p>
        </div>

        {/* Report Configuration */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Report Configuration</h2>

          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-3">Report Type</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setReportType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                      reportType === type.value
                        ? 'border-blue-500 bg-blue-600/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">{type.icon}</div>
                    <p className="text-gray-900 dark:text-white font-semibold mb-1">{type.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Device Filter</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                  disabled={reportType === 'system_health'}
                >
                  <option value="all">All Devices</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.device_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <span>{generating ? '⏳' : '📄'}</span>
                  <span>{generating ? 'Generating...' : 'Generate Report'}</span>
                </button>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Report Preview */}
        {reportPreview && (
          <div className="glass rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Report Preview</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportReport('pdf')}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-200 text-sm"
                >
                  📕 Export PDF
                </button>
                <button
                  onClick={() => exportReport('xlsx')}
                  className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all duration-200 text-sm"
                >
                  📊 Export Excel
                </button>
                <button
                  onClick={() => exportReport('csv')}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 text-sm"
                >
                  📄 Export CSV
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Report Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{reportPreview.type}</h3>
                <p className="text-gray-600 dark:text-gray-400">Period: {reportPreview.period}</p>
                <p className="text-xs text-gray-500 mt-2">Generated on: {new Date().toLocaleString()}</p>
              </div>

              {/* Report Data */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Object.entries(reportPreview).filter(([key]) => !['type', 'period'].includes(key)).map(([key, value]) => (
                  <div key={key} className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!reportPreview && (
          <div className="glass rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Report Generated</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Configure your report settings above and click "Generate Report" to create a comprehensive analysis
            </p>
          </div>
        )}

        {/* Quick Reports */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-6 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200 text-left border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Daily Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quick overview of today's activity</p>
            </button>

            <button className="p-6 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200 text-left border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Weekly Report</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive 7-day analysis</p>
            </button>

            <button className="p-6 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 rounded-lg transition-all duration-200 text-left border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">📆</div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Monthly Report</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">30-day performance review</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
