import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet,
  Gauge,
  WifiOff,
  Activity,
  Download,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Thermometer,
  Wind,
  Droplets,
  Battery,
  TrendingUp,
  MapPin,
  Clock,
  X,
  Zap,
  Calculator
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getReadings } from '../services/api';

const AdvancedReports = () => {
  const navigate = useNavigate();
  const [sectionData, setSectionData] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDevices, setSectionDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [downloadingDeviceId, setDownloadingDeviceId] = useState(null);

  // Device Analytics Modal
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceAnalytics, setDeviceAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const sectionColors = [
    'from-blue-600 to-blue-700',
    'from-green-600 to-green-700',
    'from-purple-600 to-purple-700',
    'from-orange-600 to-orange-700',
    'from-pink-600 to-pink-700',
  ];

  useEffect(() => {
    fetchSectionData();
  }, []);

  const fetchSectionData = async () => {
    try {
      const response = await fetch('/api/sections/stats');
      if (response.ok) {
        const data = await response.json();
        const filteredSections = (data.sections || []).filter(
          section => section.section_id !== 'OTHER' && section.section_id !== 'ALL'
        );
        setSectionData(filteredSections);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching section stats:', error);
      setLoading(false);
    }
  };

  const fetchDevicesForSection = async (sectionId) => {
    try {
      const response = await fetch(`/api/sections/${sectionId}/devices`);
      if (response.ok) {
        const data = await response.json();
        setSectionDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    }
  };

  const handleSectionClick = async (section) => {
    if (selectedSection?.section_id === section.section_id) {
      setSelectedSection(null);
      setSectionDevices([]);
    } else {
      setSelectedSection(section);
      await fetchDevicesForSection(section.section_id);
    }
  };

  const getSortedDevices = () => {
    return [...sectionDevices].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return 0;
    });
  };

  // Fetch device analytics (30 days data with averages)
  const fetchDeviceAnalytics = async (device) => {
    setLoadingAnalytics(true);
    setSelectedDevice(device);
    setShowAnalyticsModal(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      let allData = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = {
          device_id: device.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: page,
          page_size: 1000
        };

        const response = await getReadings(params);
        const data = response.data || response || [];

        if (Array.isArray(data) && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        setDeviceAnalytics({ noData: true });
        setLoadingAnalytics(false);
        return;
      }

      // Calculate analytics
      const analytics = calculateAnalytics(allData);
      setDeviceAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load device analytics');
      setDeviceAnalytics({ error: true });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Calculate min, max, avg for all parameters
  const calculateAnalytics = (readings) => {
    const params = {
      temperature: { values: [], label: 'Temperature', unit: '°F', icon: 'thermometer', color: 'orange' },
      static_pressure: { values: [], label: 'Static Pressure', unit: 'PSI', icon: 'gauge', color: 'green' },
      diff_pressure: { values: [], label: 'Diff Pressure', unit: 'IWC', icon: 'wind', color: 'purple' },
      last_hour_volume: { values: [], label: 'Hourly Volume', unit: 'MCF', icon: 'droplets', color: 'cyan' },
      total_volume: { values: [], label: 'Total Volume', unit: 'MCF', icon: 'trending', color: 'blue' },
      battery: { values: [], label: 'Battery', unit: 'V', icon: 'battery', color: 'yellow' },
      last_hour_energy: { values: [], label: 'Hourly Energy', unit: 'MMBTU', icon: 'zap', color: 'amber' },
      specific_gravity: { values: [], label: 'Specific Gravity', unit: '', icon: 'calculator', color: 'indigo' },
      last_hour_flow_time: { values: [], label: 'Flow Time', unit: 'hrs', icon: 'clock', color: 'teal' },
    };

    // Collect values
    readings.forEach(reading => {
      if (reading.temperature != null) params.temperature.values.push(reading.temperature);
      if (reading.static_pressure != null) params.static_pressure.values.push(reading.static_pressure);
      if (reading.diff_pressure != null) params.diff_pressure.values.push(reading.diff_pressure);
      if (reading.last_hour_volume != null) params.last_hour_volume.values.push(reading.last_hour_volume);
      if (reading.total_volume != null) params.total_volume.values.push(reading.total_volume);
      if (reading.battery != null) params.battery.values.push(reading.battery);
      if (reading.last_hour_energy != null) params.last_hour_energy.values.push(reading.last_hour_energy);
      if (reading.specific_gravity != null) params.specific_gravity.values.push(reading.specific_gravity);
      if (reading.last_hour_flow_time != null) params.last_hour_flow_time.values.push(reading.last_hour_flow_time);
    });

    // Calculate stats
    const results = {};
    Object.keys(params).forEach(key => {
      const values = params[key].values;
      if (values.length > 0) {
        results[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length,
          label: params[key].label,
          unit: params[key].unit,
          icon: params[key].icon,
          color: params[key].color
        };
      }
    });

    return {
      stats: results,
      totalReadings: readings.length,
      dateRange: {
        start: new Date(Math.min(...readings.map(r => new Date(r.timestamp)))),
        end: new Date(Math.max(...readings.map(r => new Date(r.timestamp))))
      },
      readings: readings
    };
  };

  // Download raw data report
  const downloadReport = async () => {
    if (!deviceAnalytics || !deviceAnalytics.readings) return;

    setGeneratingReport(true);

    try {
      const readings = deviceAnalytics.readings;

      // Sort by timestamp
      readings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const excelData = readings.map((reading, index) => {
        const date = new Date(reading.timestamp);
        return {
          'Seq': index + 1,
          'Date': `${date.getDate()}-${date.toLocaleString('en-US', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`,
          'Time': `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
          'Flow Time (hrs)': reading.last_hour_flow_time?.toFixed(2) || '',
          'Diff Pressure (IWC)': reading.diff_pressure?.toFixed(4) || '',
          'Static Pressure (PSI)': reading.static_pressure?.toFixed(4) || '',
          'Temperature (°F)': reading.temperature?.toFixed(2) || '',
          'Hourly Volume (MCF)': reading.last_hour_volume?.toFixed(4) || '',
          'Total Volume (MCF)': reading.total_volume?.toFixed(2) || '',
          'Hourly Energy (MMBTU)': reading.last_hour_energy?.toFixed(4) || '',
          'Specific Gravity': reading.specific_gravity?.toFixed(4) || '',
          'Battery (V)': reading.battery?.toFixed(2) || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 18 },
        { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
        { wch: 14 }, { wch: 12 }
      ];

      const workbook = XLSX.utils.book_new();
      const sheetName = (selectedDevice.device_name || selectedDevice.client_id).substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const filename = `${selectedDevice.device_name || selectedDevice.client_id}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`Report downloaded! ${readings.length} records exported.`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const closeModal = () => {
    setShowAnalyticsModal(false);
    setSelectedDevice(null);
    setDeviceAnalytics(null);
  };

  // Download Monthly Report (30 days, 6 AM readings only - one per day)
  const downloadMonthlyReport = async (device) => {
    setDownloadingDeviceId(device.id);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      let allData = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = {
          device_id: device.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          page: page,
          page_size: 1000
        };

        const response = await getReadings(params);
        const data = response.data || response || [];

        if (Array.isArray(data) && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          if (data.length < 1000) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        toast.error('No data found for this device');
        setDownloadingDeviceId(null);
        return;
      }

      // Sort by timestamp
      allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Filter to get only 6 AM readings (one per day)
      const dailyReadings = [];
      const seenDates = new Set();

      allData.forEach(reading => {
        const date = new Date(reading.timestamp);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const hour = date.getHours();

        // Get reading closest to 6 AM for each day (between 5 AM and 7 AM)
        if (!seenDates.has(dateKey) && hour >= 5 && hour <= 7) {
          seenDates.add(dateKey);
          dailyReadings.push(reading);
        }
      });

      // If no 6 AM readings found, get first reading of each day
      if (dailyReadings.length === 0) {
        const seenDatesAlt = new Set();
        allData.forEach(reading => {
          const date = new Date(reading.timestamp);
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          if (!seenDatesAlt.has(dateKey)) {
            seenDatesAlt.add(dateKey);
            dailyReadings.push(reading);
          }
        });
      }

      // Format data for Excel
      const excelData = dailyReadings.map((reading, index) => {
        const date = new Date(reading.timestamp);
        return {
          'S.No': index + 1,
          'Date': `${date.getDate()}-${date.toLocaleString('en-US', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`,
          'Time': `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`,
          'Flow Time (hrs)': reading.last_hour_flow_time?.toFixed(2) || reading.flow_time?.toFixed(2) || '',
          'Diff Pressure (IWC)': reading.last_hour_diff_pressure?.toFixed(4) || reading.diff_pressure?.toFixed(4) || '',
          'Static Pressure (PSI)': reading.last_hour_static_pressure?.toFixed(4) || reading.static_pressure?.toFixed(4) || '',
          'Temperature (°F)': reading.last_hour_temperature?.toFixed(2) || reading.temperature?.toFixed(2) || '',
          'Hourly Volume (MCF)': reading.last_hour_volume?.toFixed(4) || reading.corrected_volume?.toFixed(4) || '',
          'Total Volume (MCF)': reading.total_volume?.toFixed(2) || '',
          'Hourly Energy (MMBTU)': reading.last_hour_energy?.toFixed(4) || reading.energy?.toFixed(4) || '',
          'Specific Gravity': reading.specific_gravity?.toFixed(4) || '',
          'Battery (V)': reading.battery?.toFixed(2) || '',
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 18 },
        { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
        { wch: 14 }, { wch: 12 }
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const sheetName = (device.device_name || device.client_id).substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate filename with month/year
      const monthName = new Date().toLocaleString('en-US', { month: 'short' });
      const year = new Date().getFullYear();
      const filename = `${device.device_name || device.client_id}_Monthly_${monthName}_${year}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);

      toast.success(`Monthly report downloaded! ${dailyReadings.length} daily readings exported.`);
    } catch (error) {
      console.error('Error generating monthly report:', error);
      toast.error('Failed to generate monthly report');
    } finally {
      setDownloadingDeviceId(null);
    }
  };

  const getSectionColor = (index) => sectionColors[index % sectionColors.length];

  const getIconComponent = (iconName) => {
    const icons = {
      thermometer: Thermometer,
      gauge: Gauge,
      wind: Wind,
      droplets: Droplets,
      trending: TrendingUp,
      battery: Battery,
      zap: Zap,
      calculator: Calculator,
      clock: Clock
    };
    return icons[iconName] || Gauge;
  };

  const getColorClasses = (color) => {
    const colors = {
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', icon: 'text-orange-500' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: 'text-green-500' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-500' },
      cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', icon: 'text-cyan-500' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-500' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', icon: 'text-yellow-500' },
      amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'text-amber-500' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', icon: 'text-indigo-500' },
      teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-600', icon: 'text-teal-500' },
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-400">Loading section data...</p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8" />
                Advanced Reports
              </h1>
              <p className="text-gray-600 mt-1">View device analytics and download detailed reports</p>
            </div>
            {selectedSection && (
              <button
                onClick={() => {
                  setSelectedSection(null);
                  setSectionDevices([]);
                }}
                className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 font-semibold hover:scale-105 flex items-center gap-2"
              >
                <ChevronUp className="w-4 h-4" />
                Close Section
              </button>
            )}
          </div>
        </div>

        {/* Section Cards Grid */}
        {!selectedSection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectionData.map((section, index) => {
              const offlineDevices = section.sms_count - section.active_sms;
              return (
                <div
                  key={section.section_id}
                  onClick={() => handleSectionClick(section)}
                  className="glass rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${getSectionColor(index)} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <span className="text-2xl font-bold">{section.section_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Total Devices</div>
                      <div className="text-3xl font-bold text-cyan-600">{section.sms_count}</div>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{section.section_name}</h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-green-600" />
                        <div className="text-xs text-gray-600">Online</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{section.active_sms}</div>
                    </div>
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <WifiOff className="w-4 h-4 text-red-600" />
                        <div className="text-xs text-gray-600">Offline</div>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                    <span className="text-sm text-gray-600">Click to view devices</span>
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Devices List */
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getSectionColor(sectionData.indexOf(selectedSection))} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                <span className="text-2xl font-bold">{selectedSection.section_id}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total Devices</div>
                <div className="text-3xl font-bold text-cyan-600">{sectionDevices.length}</div>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedSection.section_name}</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-gray-600">Online</div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {sectionDevices.filter(d => d.is_active).length}
                </div>
              </div>
              <div className="bg-red-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <div className="text-xs text-gray-600">Offline</div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {sectionDevices.filter(d => !d.is_active).length}
                </div>
              </div>
            </div>

            {/* Device Table */}
            <div className="border-t border-gray-300 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Device List</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {sectionDevices.length} devices
                </span>
              </div>

              {sectionDevices.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Gauge className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No devices found</p>
                </div>
              ) : (
                <div className="overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: '500px' }}>
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Last Reading</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedDevices().map((device, index) => (
                        <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {device.device_name || device.client_id}
                            </div>
                            <div className="text-xs text-gray-500">{device.client_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              device.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {device.is_active ? <Activity className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              {device.is_active ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {device.location || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">
                              {device.last_reading_at ? new Date(device.last_reading_at).toLocaleString() : 'No data'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => navigate(`/trends/${device.client_id}`)}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                              >
                                <BarChart3 className="w-3 h-3" />
                                Trends
                              </button>
                              <button
                                onClick={() => downloadMonthlyReport(device)}
                                disabled={downloadingDeviceId === device.id}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                              >
                                {downloadingDeviceId === device.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    <span>...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3 h-3" />
                                    Report
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => fetchDeviceAnalytics(device)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                Analytics
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Device Analytics
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedDevice?.device_name || selectedDevice?.client_id} - Last 30 Days
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {loadingAnalytics ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-500">Loading analytics...</p>
                </div>
              ) : deviceAnalytics?.noData ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No data available for this device</p>
                  <p className="text-gray-400 text-sm mt-1">Try selecting a different time period</p>
                </div>
              ) : deviceAnalytics?.error ? (
                <div className="text-center py-12">
                  <p className="text-red-500">Error loading analytics</p>
                </div>
              ) : deviceAnalytics?.stats ? (
                <>
                  {/* Summary Stats */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Total Readings</p>
                        <p className="text-2xl font-bold text-gray-900">{deviceAnalytics.totalReadings}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Date Range</p>
                        <p className="text-sm font-medium text-gray-700">
                          {deviceAnalytics.dateRange.start.toLocaleDateString()} - {deviceAnalytics.dateRange.end.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parameters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {Object.entries(deviceAnalytics.stats).map(([key, stat]) => {
                      const IconComponent = getIconComponent(stat.icon);
                      const colorClasses = getColorClasses(stat.color);

                      return (
                        <div
                          key={key}
                          className={`${colorClasses.bg} ${colorClasses.border} border rounded-xl p-4`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <IconComponent className={`w-5 h-5 ${colorClasses.icon}`} />
                            <span className="font-semibold text-gray-800">{stat.label}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Average</span>
                              <span className={`text-lg font-bold ${colorClasses.text}`}>
                                {stat.avg.toFixed(2)} {stat.unit}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">Min</span>
                              <span className="font-medium text-gray-700">{stat.min.toFixed(2)} {stat.unit}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500">Max</span>
                              <span className="font-medium text-gray-700">{stat.max.toFixed(2)} {stat.unit}</span>
                            </div>
                            <div className="pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-400">{stat.count} readings</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Download Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={downloadReport}
                      disabled={generatingReport}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                    >
                      {generatingReport ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Download Full Report (Excel)
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdvancedReports;
