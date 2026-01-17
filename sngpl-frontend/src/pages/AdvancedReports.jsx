import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Building2, Gauge, WifiOff, Activity, Download, Calendar, ChevronDown, ChevronUp, CheckSquare, Square, X, BarChart3, Thermometer, Wind, Droplets, Battery, TrendingUp, MapPin, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getReadings } from '../services/api';

const AdvancedReports = () => {
  const navigate = useNavigate();
  const [sectionData, setSectionData] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionDevices, setSectionDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Report generation state
  const [comparisonType, setComparisonType] = useState('15days'); // '15days', '30days', or 'midmonth'
  const [generatingReport, setGeneratingReport] = useState(false);

  // Section colors matching the Sections page
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
        // Filter to only show sections I-V, exclude OTHER section
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
        // data contains: { section_id, section_name, device_count, devices: [...] }
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

  // Sort devices: Online first, then offline
  const getSortedDevices = () => {
    return [...sectionDevices].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return 0;
    });
  };

  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setComparisonType('15days'); // Default to 15 days
    setShowReportModal(true);
  };

  // Generate Section Report - All devices in the section
  const generateSectionReport = async () => {
    if (!selectedSection || sectionDevices.length === 0) return;

    setGeneratingReport(true);

    try {
      const now = new Date();
      let periodA_start, periodA_end, periodB_start, periodB_end, comparisonLabel;

      // Define date ranges based on comparison type
      if (comparisonType === '15days') {
        // Period B: Last 15 days (current period)
        periodB_end = new Date(now);
        periodB_start = new Date(now);
        periodB_start.setDate(periodB_start.getDate() - 15);

        // Period A: Previous 15 days
        periodA_end = new Date(periodB_start);
        periodA_start = new Date(periodA_end);
        periodA_start.setDate(periodA_start.getDate() - 15);

        comparisonLabel = '15 Days';
      } else if (comparisonType === '30days') {
        // Period B: Last 30 days (current period)
        periodB_end = new Date(now);
        periodB_start = new Date(now);
        periodB_start.setDate(periodB_start.getDate() - 30);

        // Period A: Previous 30 days
        periodA_end = new Date(periodB_start);
        periodA_start = new Date(periodA_end);
        periodA_start.setDate(periodA_start.getDate() - 30);

        comparisonLabel = '30 Days';
      }

      // Format dates for display in header
      const formatDateShort = (date) => {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
      };

      // Fetch data for a device for both periods
      const fetchDeviceData = async (deviceId, startDate, endDate) => {
        try {
          let allData = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const params = {
              device_id: deviceId,
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
          return allData;
        } catch (err) {
          console.error('Error fetching device data:', err);
          return [];
        }
      };

      // Calculate total volume
      const calculateTotalVolume = (readings) => {
        if (!Array.isArray(readings)) return 0;
        return readings.reduce((sum, reading) => {
          const volume = reading.last_hour_volume || reading.volume || 0;
          return sum + volume;
        }, 0);
      };

      toast('Generating report for all devices in section...', { icon: 'ℹ️' });

      // Group devices by region/location
      const devicesByRegion = {};
      sectionDevices.forEach(device => {
        const region = device.location || 'Unknown';
        if (!devicesByRegion[region]) {
          devicesByRegion[region] = [];
        }
        devicesByRegion[region].push(device);
      });

      // Process all devices and collect data
      const excelData = [];
      let srNo = 1;
      let grandTotalA = 0;
      let grandTotalB = 0;

      for (const region of Object.keys(devicesByRegion)) {
        let regionTotalA = 0;
        let regionTotalB = 0;
        const regionDevices = devicesByRegion[region];

        for (const device of regionDevices) {
          // Fetch data for both periods
          const [periodA_data, periodB_data] = await Promise.all([
            fetchDeviceData(device.id, periodA_start, periodA_end),
            fetchDeviceData(device.id, periodB_start, periodB_end)
          ]);

          const volumeA = calculateTotalVolume(periodA_data);
          const volumeB = calculateTotalVolume(periodB_data);
          const difference = volumeB - volumeA;

          regionTotalA += volumeA;
          regionTotalB += volumeB;

          excelData.push({
            'Sr. No.': srNo++,
            'Region': region,
            'SMSs Name': device.device_name || device.client_id,
            [`Volume for ${formatDateShort(periodA_start)} to ${formatDateShort(periodA_end)} (MMCF) [A]`]: volumeA.toFixed(3),
            [`Volume for ${formatDateShort(periodB_start)} to ${formatDateShort(periodB_end)} (MMCF) [B]`]: volumeB.toFixed(3),
            'Difference (B - A)': difference.toFixed(3)
          });
        }

        // Add region subtotal row
        excelData.push({
          'Sr. No.': '',
          'Region': '',
          'SMSs Name': '',
          [`Volume for ${formatDateShort(periodA_start)} to ${formatDateShort(periodA_end)} (MMCF) [A]`]: regionTotalA.toFixed(3),
          [`Volume for ${formatDateShort(periodB_start)} to ${formatDateShort(periodB_end)} (MMCF) [B]`]: regionTotalB.toFixed(3),
          'Difference (B - A)': (regionTotalB - regionTotalA).toFixed(3)
        });

        grandTotalA += regionTotalA;
        grandTotalB += regionTotalB;
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 8 },   // Sr. No.
        { wch: 20 },  // Region
        { wch: 30 },  // SMSs Name
        { wch: 25 },  // Volume A
        { wch: 25 },  // Volume B
        { wch: 18 },  // Difference
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Section ${selectedSection.section_id}`);

      // Generate filename
      const filename = `Section_${selectedSection.section_id}_${comparisonLabel}_Comparison_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);

      toast.success(`Section ${selectedSection.section_id} report generated successfully!`);
      setShowReportModal(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate section report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate Single Device Report
  const generateReport = async () => {
    if (!selectedDevice) return;

    setGeneratingReport(true);

    try {
      const now = new Date();
      let periodA_start, periodA_end, periodB_start, periodB_end, comparisonLabel;

      if (comparisonType === '15days') {
        periodB_end = new Date(now);
        periodB_start = new Date(now);
        periodB_start.setDate(periodB_start.getDate() - 15);
        periodA_end = new Date(periodB_start);
        periodA_start = new Date(periodA_end);
        periodA_start.setDate(periodA_start.getDate() - 15);
        comparisonLabel = '15 Days';
      } else if (comparisonType === '30days') {
        periodB_end = new Date(now);
        periodB_start = new Date(now);
        periodB_start.setDate(periodB_start.getDate() - 30);
        periodA_end = new Date(periodB_start);
        periodA_start = new Date(periodA_end);
        periodA_start.setDate(periodA_start.getDate() - 30);
        comparisonLabel = '30 Days';
      }

      const formatDateShort = (date) => {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
      };

      const fetchPeriodData = async (startDate, endDate) => {
        try {
          let allData = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const params = {
              device_id: selectedDevice.id,
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
          return allData;
        } catch (err) {
          console.error('Error fetching period data:', err);
          return [];
        }
      };

      toast('Fetching data...', { icon: 'ℹ️' });

      const [periodA_data, periodB_data] = await Promise.all([
        fetchPeriodData(periodA_start, periodA_end),
        fetchPeriodData(periodB_start, periodB_end)
      ]);

      const calculateTotalVolume = (readings) => {
        if (!Array.isArray(readings)) return 0;
        return readings.reduce((sum, reading) => {
          const volume = reading.last_hour_volume || reading.volume || 0;
          return sum + volume;
        }, 0);
      };

      const periodA_volume = calculateTotalVolume(periodA_data);
      const periodB_volume = calculateTotalVolume(periodB_data);
      const difference = periodB_volume - periodA_volume;

      const excelData = [{
        'Sr. No.': 1,
        'Region': selectedDevice.location || 'Unknown',
        'SMSs Name': selectedDevice.device_name || selectedDevice.client_id,
        [`Volume for ${formatDateShort(periodA_start)} to ${formatDateShort(periodA_end)} (MMCF) [A]`]: periodA_volume.toFixed(3),
        [`Volume for ${formatDateShort(periodB_start)} to ${formatDateShort(periodB_end)} (MMCF) [B]`]: periodB_volume.toFixed(3),
        'Difference (B - A)': difference.toFixed(3)
      }];

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!cols'] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 30 },
        { wch: 25 },
        { wch: 25 },
        { wch: 18 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${comparisonLabel} Comparison`);

      const filename = `${selectedDevice.client_id}_${comparisonLabel}_Comparison_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`Report generated successfully!`);
      setShowReportModal(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getSectionColor = (index) => {
    return sectionColors[index % sectionColors.length];
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
              <p className="text-gray-600 mt-1">Generate detailed analytics reports for devices</p>
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
                  {/* Header with Section Number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${getSectionColor(index)} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <span className="text-2xl font-bold">{section.section_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Total Devices</div>
                      <div className="text-3xl font-bold text-cyan-600">{section.sms_count}</div>
                      <div className="text-xs text-gray-600">Available for reports</div>
                    </div>
                  </div>

                  {/* Section Name */}
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{section.section_name}</h2>

                  {/* Stats Grid - 2x2 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Total Devices */}
                    <div className="bg-blue-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Gauge className="w-4 h-4 text-blue-600" />
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{section.sms_count}</div>
                    </div>

                    {/* Offline Devices */}
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <WifiOff className="w-4 h-4 text-red-600" />
                        <div className="text-xs text-gray-600">Offline</div>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
                    </div>

                    {/* Active Devices */}
                    <div className="bg-green-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-green-600" />
                        <div className="text-xs text-gray-600">Online</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{section.active_sms}</div>
                    </div>

                    {/* Online Devices */}
                    <div className="bg-cyan-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                        <div className="text-xs text-gray-600">Reports</div>
                      </div>
                      <div className="text-xl font-bold text-cyan-600">{section.active_sms}</div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                    <span className="text-sm text-gray-600">Click to view devices</span>
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Devices List - Table inside Section Card
          <div className="glass rounded-xl p-6">
            {/* Section Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getSectionColor(sectionData.indexOf(selectedSection))} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                <span className="text-2xl font-bold">{selectedSection.section_id}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total Devices</div>
                <div className="text-3xl font-bold text-cyan-600">{sectionDevices.length}</div>
                <div className="text-xs text-gray-600">Available for reports</div>
              </div>
            </div>

            {/* Section Name */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedSection.section_name}</h2>

            {/* Device Stats - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Total Devices */}
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{sectionDevices.length}</div>
              </div>

              {/* Online Devices */}
              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-gray-600">Online</div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {sectionDevices.filter(d => d.is_active).length}
                </div>
              </div>

              {/* Offline Devices */}
              <div className="bg-red-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <div className="text-xs text-gray-600">Offline</div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {sectionDevices.filter(d => !d.is_active).length}
                </div>
              </div>

              {/* Reports Available */}
              <div className="bg-cyan-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                  <div className="text-xs text-gray-600">Reports</div>
                </div>
                <div className="text-2xl font-bold text-cyan-600">{sectionDevices.length}</div>
              </div>
            </div>

            {/* Generate Section Report Button */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Generate Section Report</h3>
                  <p className="text-sm text-gray-600">Download volume comparison for all {sectionDevices.length} devices</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={comparisonType}
                    onChange={(e) => setComparisonType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15days">15 Days Comparison</option>
                    <option value="30days">30 Days Comparison</option>
                  </select>
                  <button
                    onClick={generateSectionReport}
                    disabled={generatingReport}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {generatingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Device Table */}
            <div className="border-t border-gray-300 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Device List</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {sectionDevices.length} device{sectionDevices.length !== 1 ? 's' : ''}
                </span>
              </div>

              {sectionDevices.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Gauge className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No Devices</p>
                  <p className="text-xs text-gray-500">No devices found in this section</p>
                </div>
              ) : (
                <div className="overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: '500px' }}>
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Flow Time (hrs)
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Wind className="w-3 h-3 text-purple-600" />
                            LH Diff P (IWC)
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-green-600" />
                            LH Static P (PSI)
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-orange-600" />
                            LH Temp (°F)
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-cyan-600" />
                            LH Volume (MCF)
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Battery className="w-3 h-3 text-yellow-600" />
                            LH Energy
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-indigo-600" />
                            Sp. Gravity
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Reading</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedDevices().map((device, index) => {
                        const batteryVoltage = device.latest_reading?.battery || 0;
                        const getBatteryColor = (voltage) => {
                          if (voltage === 0) return 'text-gray-500';
                          if (voltage < 10) return 'text-red-600';
                          if (voltage < 10.5) return 'text-red-400';
                          if (voltage <= 14) return 'text-green-400';
                          return 'text-yellow-400';
                        };

                        return (
                          <tr
                            key={device.id}
                            className="hover:bg-gray-100 transition-colors"
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
                                {device.is_active ? (
                                  <>
                                    <Activity className="w-3 h-3" />
                                    Online
                                  </>
                                ) : (
                                  <>
                                    <WifiOff className="w-3 h-3" />
                                    Offline
                                  </>
                                )}
                              </span>
                            </td>

                    

                            {/* T18: Last Hour Flow Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-blue-600">
                                {device.latest_reading?.last_hour_flow_time?.toFixed(2) || '-'}
                              </span>
                            </td>

                            {/* T19: Last Hour Diff Pressure */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-purple-600">
                                {device.latest_reading?.last_hour_diff_pressure?.toFixed(2) || '-'}
                              </span>
                            </td>

                            {/* T110: Last Hour Static Pressure */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {device.latest_reading?.last_hour_static_pressure?.toFixed(1) || '-'}
                              </span>
                            </td>

                            {/* T111: Last Hour Temperature */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-orange-600">
                                {device.latest_reading?.last_hour_temperature?.toFixed(1) || '-'}
                              </span>
                            </td>

                            {/* T112: Last Hour Volume */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-cyan-600">
                                {device.latest_reading?.last_hour_volume?.toFixed(2) || '-'}
                              </span>
                            </td>

                            {/* T113: Last Hour Energy */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-yellow-600">
                                {device.latest_reading?.last_hour_energy?.toFixed(2) || '-'}
                              </span>
                            </td>

                            {/* T114: Specific Gravity */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-indigo-600">
                                {device.latest_reading?.specific_gravity?.toFixed(4) || '-'}
                              </span>
                            </td>

                            {/* Last Reading */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs text-gray-600">
                                {device.last_reading_at
                                  ? new Date(device.last_reading_at).toLocaleString()
                                  : 'No data'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => navigate(`/trends/${device.client_id}`)}
                                  className="px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-1"
                                  title="View Trends & Charts"
                                >
                                  <BarChart3 className="w-3 h-3" />
                                  Trends
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeviceClick(device);
                                  }}
                                  className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-1"
                                  title="Generate Excel Report"
                                >
                                  <Download className="w-3 h-3" />
                                  Report
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Generate Report</h3>
                  <p className="text-blue-100 mt-1">{selectedDevice?.client_id}</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">Volume Comparison Report</h4>
                    <p className="text-sm text-blue-700">
                      Compare volume data between two time periods for device <strong>{selectedDevice?.client_id}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Type Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Select Comparison Type
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* 15 Days Comparison */}
                  <div
                    onClick={() => setComparisonType('15days')}
                    className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      comparisonType === '15days'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="mt-1">
                      {comparisonType === '15days' ? (
                        <CheckSquare className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg mb-1">15 Days Comparison</div>
                      <p className="text-sm text-gray-600">
                        Compare volume between the <strong>last 15 days</strong> and the <strong>previous 15 days</strong> (16-30 days ago)
                      </p>
                    </div>
                  </div>

                  {/* 30 Days Comparison */}
                  <div
                    onClick={() => setComparisonType('30days')}
                    className={`flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      comparisonType === '30days'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="mt-1">
                      {comparisonType === '30days' ? (
                        <CheckSquare className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg mb-1">30 Days Comparison</div>
                      <p className="text-sm text-gray-600">
                        Compare volume between the <strong>last 30 days</strong> and the <strong>previous 30 days</strong> (31-60 days ago)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Comparison...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Generate Comparison Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdvancedReports;
