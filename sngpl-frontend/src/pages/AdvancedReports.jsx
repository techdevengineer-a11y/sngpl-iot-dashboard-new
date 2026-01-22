import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Building2, Gauge, WifiOff, Activity, Download, Calendar, ChevronDown, ChevronUp, CheckSquare, Square, X, BarChart3, Thermometer, Wind, Droplets, Battery, TrendingUp, MapPin, Clock } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
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
  const [reportType, setReportType] = useState('30days'); // 15days, 30days, or custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sectionComparisonType, setSectionComparisonType] = useState('15days'); // For section reports
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
    setReportType('30days'); // Default to 30 days
    // Set default custom dates (last 30 days)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
    setCustomStartDate(startDate.toISOString().split('T')[0]);
    setCustomEndDate(now.toISOString().split('T')[0]);
    setShowReportModal(true);
  };

  // Generate Section Report - All devices in the section
  const generateSectionReport = async () => {
    if (!selectedSection || sectionDevices.length === 0) return;

    setGeneratingReport(true);

    try {
      const now = new Date();
      let periodA_start, periodA_end, periodB_start, periodB_end, comparisonLabel, periodType;

      // Get month names
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

      // Define date ranges based on comparison type
      if (sectionComparisonType === '15days') {
        // Period B: Current month 1st to 15th (or up to today if before 15th)
        const currentDay = now.getDate();
        const periodBEndDay = Math.min(currentDay, 15);
        periodB_end = new Date(now.getFullYear(), now.getMonth(), periodBEndDay, 23, 59, 59);
        periodB_start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

        // Period A: Previous month 1st to 15th
        periodA_end = new Date(now.getFullYear(), now.getMonth() - 1, 15, 23, 59, 59);
        periodA_start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);

        comparisonLabel = 'MID-MONTH';
        periodType = '01*15';
      } else if (sectionComparisonType === '30days') {
        // Period B: Current month (full month or up to today)
        const lastDayB = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        periodB_end = new Date(now.getFullYear(), now.getMonth(), currentDay, 23, 59, 59);
        periodB_start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

        // Period A: Previous month (full month)
        const lastDayA = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        periodA_end = new Date(now.getFullYear(), now.getMonth() - 1, lastDayA, 23, 59, 59);
        periodA_start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);

        comparisonLabel = 'FULL-MONTH';
        periodType = '01*' + lastDayB;
      }

      // Format for column headers
      const monthA = monthNames[periodA_start.getMonth()];
      const yearA = periodA_start.getFullYear().toString().slice(-2);
      const monthB = monthNames[periodB_start.getMonth()];
      const yearB = periodB_start.getFullYear().toString().slice(-2);

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

      // Calculate total volume using 6 AM daily readings only
      const calculateTotalVolume = (readings) => {
        if (!Array.isArray(readings) || readings.length === 0) return 0;

        // Group readings by date and pick the one closest to 6 AM
        const readingsByDate = {};

        readings.forEach(reading => {
          const readingDate = new Date(reading.timestamp || reading.created_at);
          const dateKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}-${String(readingDate.getDate()).padStart(2, '0')}`;
          const hour = readingDate.getHours();
          const minutes = readingDate.getMinutes();
          const timeInMinutes = hour * 60 + minutes;
          const targetTime = 6 * 60; // 6 AM in minutes
          const timeDiff = Math.abs(timeInMinutes - targetTime);

          // Only consider readings between 5 AM and 7 AM
          if (hour >= 5 && hour <= 7) {
            if (!readingsByDate[dateKey] || timeDiff < readingsByDate[dateKey].timeDiff) {
              readingsByDate[dateKey] = {
                reading,
                timeDiff
              };
            }
          }
        });

        // Sum the 6 AM daily volumes (only use last_hour_volume, not cumulative volume)
        let totalVolume = 0;
        Object.values(readingsByDate).forEach(({ reading }) => {
          const volume = reading.last_hour_volume || 0;
          totalVolume += volume;
        });

        return totalVolume;
      };

      // Column headers matching the format - dates as 01*15.12.2024
      const dateFormatA = `${periodType}.${String(periodA_start.getMonth() + 1).padStart(2, '0')}.${periodA_start.getFullYear()}`;
      const dateFormatB = `${periodType}.${String(periodB_start.getMonth() + 1).padStart(2, '0')}.${periodB_start.getFullYear()}`;
      const colA = `Volume for the month of ${monthA}-${periodA_start.getFullYear()} ${dateFormatA} (MMCF) (A)`;
      const colB = `Volume for the month of ${monthB}-${periodB_start.getFullYear()} ${dateFormatB} (MMCF) (B)`;

      // OPTIMIZED: Fetch all device data in parallel batches
      const BATCH_SIZE = 5; // Process 5 devices at a time
      const totalDevices = sectionDevices.length;

      toast.loading(`Fetching data for ${totalDevices} devices...`, { id: 'section-report' });

      // Process devices in parallel batches
      const deviceResults = new Map();

      for (let i = 0; i < totalDevices; i += BATCH_SIZE) {
        const batch = sectionDevices.slice(i, i + BATCH_SIZE);
        const progress = Math.min(i + BATCH_SIZE, totalDevices);

        toast.loading(`Processing devices ${progress}/${totalDevices}...`, { id: 'section-report' });

        // Fetch data for all devices in this batch in parallel
        const batchPromises = batch.map(async (device) => {
          const [periodA_data, periodB_data] = await Promise.all([
            fetchDeviceData(device.id, periodA_start, periodA_end),
            fetchDeviceData(device.id, periodB_start, periodB_end)
          ]);

          const volumeA_MCF = calculateTotalVolume(periodA_data);
          const volumeB_MCF = calculateTotalVolume(periodB_data);
          const volumeA = volumeA_MCF / 1000; // Convert to MMCF
          const volumeB = volumeB_MCF / 1000; // Convert to MMCF

          return {
            device,
            volumeA,
            volumeB,
            difference: volumeB - volumeA
          };
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          deviceResults.set(result.device.id, result);
        });
      }

      toast.loading('Building report...', { id: 'section-report' });

      // Format region name - remove ", PAKISTAN" and expand abbreviations to full names
      const formatRegionName = (location) => {
        if (!location) return 'Unknown';

        // Remove ", PAKISTAN" or ", Pakistan" suffix
        let region = location.replace(/,?\s*PAKISTAN$/i, '').trim();

        // Map common abbreviations to full names
        const regionMappings = {
          'FSD': 'FAISALABAD',
          'SGD': 'SARGODHA',
          'SKP': 'SHEIKHUPURA',
          'GJW': 'GUJRANWALA',
          'GJT': 'GUJRAT',
          'MLT': 'MULTAN',
          'LHR': 'LAHORE',
          'RWP': 'RAWALPINDI',
          'ISB': 'ISLAMABAD',
        };

        // Check if the region matches any abbreviation
        const upperRegion = region.toUpperCase();
        if (regionMappings[upperRegion]) {
          return regionMappings[upperRegion];
        }

        return region.toUpperCase();
      };

      // Group devices by region/location
      const devicesByRegion = {};
      sectionDevices.forEach(device => {
        const region = formatRegionName(device.location);
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

      const regions = Object.keys(devicesByRegion).sort();

      for (const region of regions) {
        let regionTotalA = 0;
        let regionTotalB = 0;
        const regionDevices = devicesByRegion[region];
        let isFirstInRegion = true;

        for (const device of regionDevices) {
          // Get pre-fetched data from map
          const result = deviceResults.get(device.id);
          const volumeA = result?.volumeA || 0;
          const volumeB = result?.volumeB || 0;
          const difference = result?.difference || 0;

          regionTotalA += volumeA;
          regionTotalB += volumeB;

          excelData.push({
            'Sr. No.': srNo++,
            'Region': isFirstInRegion ? region.toUpperCase() : '',
            'SMSs Name': device.device_name || device.client_id,
            [colA]: volumeA.toFixed(3),
            [colB]: volumeB.toFixed(3),
            'Difference (B - A)': difference.toFixed(3)
          });

          isFirstInRegion = false;
        }

        // Add region subtotal row (highlighted row)
        excelData.push({
          'Sr. No.': '',
          'Region': '',
          'SMSs Name': '',
          [colA]: regionTotalA.toFixed(3),
          [colB]: regionTotalB.toFixed(3),
          'Difference (B - A)': (regionTotalB - regionTotalA).toFixed(3)
        });

        grandTotalA += regionTotalA;
        grandTotalB += regionTotalB;
      }

      // Create worksheet with styled title rows
      const worksheet = XLSX.utils.aoa_to_sheet([]);

      // Define styles
      const darkRedHeaderStyle = {
        fill: { fgColor: { rgb: '8B0000' } }, // Dark red background
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const columnHeaderStyle = {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        font: { color: { rgb: '8B0000' }, bold: true, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const dataStyle = {
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const subtotalStyle = {
        fill: { fgColor: { rgb: 'FFFF00' } }, // Yellow background for subtotals
        font: { bold: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Row 1: Main title (dark red background, white text)
      worksheet['A1'] = {
        v: `VOLUMES COMPARISON OF SMSs OF SECTION-${selectedSection.section_id}`,
        s: darkRedHeaderStyle
      };

      // Row 2: Subtitle with red MID-MONTH text
      worksheet['A2'] = {
        v: `BETWEEN THE ${comparisonLabel} OF ${monthA}-${yearA} VS ${monthB}-${yearB}`,
        s: {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      };

      // Row 3: Empty row
      // Row 4: Column headers
      const headers = ['Sr. No.', 'Region', 'SMSs Name', colA, colB, 'Difference (B - A)'];
      headers.forEach((header, idx) => {
        const col = String.fromCharCode(65 + idx); // A, B, C, D, E, F
        worksheet[`${col}4`] = { v: header, s: columnHeaderStyle };
      });

      // Add data starting from row 5
      let rowNum = 5;
      excelData.forEach((row) => {
        const isSubtotal = row['Sr. No.'] === '' && row['Region'] === '' && row['SMSs Name'] === '';
        const cellStyle = isSubtotal ? subtotalStyle : dataStyle;

        worksheet[`A${rowNum}`] = { v: row['Sr. No.'], s: cellStyle };
        worksheet[`B${rowNum}`] = { v: row['Region'], s: cellStyle };
        worksheet[`C${rowNum}`] = { v: row['SMSs Name'], s: cellStyle };
        worksheet[`D${rowNum}`] = { v: row[colA], s: cellStyle };
        worksheet[`E${rowNum}`] = { v: row[colB], s: cellStyle };
        worksheet[`F${rowNum}`] = { v: row['Difference (B - A)'], s: cellStyle };
        rowNum++;
      });

      // Set the range of the worksheet
      worksheet['!ref'] = `A1:F${rowNum - 1}`;

      // Set column widths
      worksheet['!cols'] = [
        { wch: 8 },   // Sr. No.
        { wch: 18 },  // Region
        { wch: 30 },  // SMSs Name
        { wch: 28 },  // Volume A
        { wch: 28 },  // Volume B
        { wch: 14 },  // Difference
      ];

      // Set row heights
      worksheet['!rows'] = [
        { hpt: 30 },  // Row 1: Title
        { hpt: 25 },  // Row 2: Subtitle
        { hpt: 15 },  // Row 3: Empty
        { hpt: 50 },  // Row 4: Column headers (taller for multi-line)
      ];

      // Merge title cells
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title row 1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Title row 2
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Section ${selectedSection.section_id}`);

      // Generate filename
      const filename = `Section_${selectedSection.section_id}_${comparisonLabel}_${monthA}${yearA}_vs_${monthB}${yearB}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);

      toast.dismiss('section-report');
      toast.success(`Section ${selectedSection.section_id} report generated successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss('section-report');
      toast.error('Failed to generate section report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Generate Single Device Monthly Report with 6 AM readings
  const generateReport = async () => {
    if (!selectedDevice) return;

    setGeneratingReport(true);

    try {
      const now = new Date();
      let startDate, endDate;

      // Determine date range based on report type
      if (reportType === 'custom') {
        if (!customStartDate || !customEndDate) {
          toast.error('Please select both start and end dates');
          setGeneratingReport(false);
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59);
      } else {
        const days = reportType === '15days' ? 15 : 30;
        endDate = new Date(now);
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
      }

      const formatDate = (date) => {
        return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
      };

      const formatDateShort = (date) => {
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
      };

      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

      const fetchAllData = async () => {
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
          console.error('Error fetching data:', err);
          return [];
        }
      };

      toast('Fetching data...', { icon: 'ℹ️' });

      const allReadings = await fetchAllData();

      // Group ALL readings by date (not just 6 AM)
      // Sum volumes and energies, average other values for each day
      const readingsByDate = {};

      allReadings.forEach(reading => {
        const readingDate = new Date(reading.timestamp || reading.created_at);
        const dateKey = `${readingDate.getFullYear()}-${String(readingDate.getMonth() + 1).padStart(2, '0')}-${String(readingDate.getDate()).padStart(2, '0')}`;

        if (!readingsByDate[dateKey]) {
          readingsByDate[dateKey] = {
            readings: [],
            date: readingDate
          };
        }
        readingsByDate[dateKey].readings.push(reading);
      });

      // Calculate daily totals/averages for each day
      const dailySummaries = Object.entries(readingsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, { readings, date }]) => {
          // SUM for volume and energy (all hourly readings in the day)
          const totalVolume = readings.reduce((sum, r) => sum + (r.last_hour_volume || 0), 0);
          const totalEnergy = readings.reduce((sum, r) => sum + (r.last_hour_energy || 0), 0);
          const totalFlowTime = readings.reduce((sum, r) => sum + (r.last_hour_flow_time || 0), 0);

          // AVERAGE of non-zero values for temperature, pressure, diff pressure
          const nonZeroTemps = readings.filter(r => r.last_hour_temperature && r.last_hour_temperature !== 0);
          const avgTemp = nonZeroTemps.length > 0
            ? nonZeroTemps.reduce((sum, r) => sum + r.last_hour_temperature, 0) / nonZeroTemps.length
            : 0;

          const nonZeroPressures = readings.filter(r => r.last_hour_static_pressure && r.last_hour_static_pressure !== 0);
          const avgPressure = nonZeroPressures.length > 0
            ? nonZeroPressures.reduce((sum, r) => sum + r.last_hour_static_pressure, 0) / nonZeroPressures.length
            : 0;

          const nonZeroDiffPressures = readings.filter(r => r.last_hour_diff_pressure && r.last_hour_diff_pressure !== 0);
          const avgDiffPressure = nonZeroDiffPressures.length > 0
            ? nonZeroDiffPressures.reduce((sum, r) => sum + r.last_hour_diff_pressure, 0) / nonZeroDiffPressures.length
            : 0;

          // Get specific gravity from first reading (it's usually constant)
          const specificGravity = readings[0]?.specific_gravity || 0;

          return {
            dateKey,
            date,
            totalVolume,
            totalEnergy,
            totalFlowTime,
            avgTemp,
            avgPressure,
            avgDiffPressure,
            specificGravity,
            readingCount: readings.length
          };
        });

      if (dailySummaries.length === 0) {
        toast.error('No readings found for the selected period');
        setGeneratingReport(false);
        return;
      }

      // Create Excel data with daily summaries
      const excelData = dailySummaries.map((day, index) => {
        return {
          srNo: index + 1,
          date: formatDate(day.date),
          time: `${day.readingCount} hrs`, // Show how many hourly readings were summed
          flowTime: day.totalFlowTime.toFixed(2),
          diffPressure: day.avgDiffPressure.toFixed(2),
          staticPressure: day.avgPressure.toFixed(1),
          temperature: day.avgTemp.toFixed(1),
          volume: day.totalVolume.toFixed(3),
          energy: day.totalEnergy.toFixed(2),
          specificGravity: day.specificGravity.toFixed(4)
        };
      });

      // Calculate grand totals from daily summaries
      // SUM of daily volumes and energies (each daily value is already the sum of 24 hourly readings)
      const grandTotalVolume = dailySummaries.reduce((sum, day) => sum + day.totalVolume, 0);
      const grandTotalEnergy = dailySummaries.reduce((sum, day) => sum + day.totalEnergy, 0);

      // AVERAGE of daily averages for Temperature (only non-zero days)
      const nonZeroTempDays = dailySummaries.filter(day => day.avgTemp !== 0);
      const grandAvgTemp = nonZeroTempDays.length > 0
        ? nonZeroTempDays.reduce((sum, day) => sum + day.avgTemp, 0) / nonZeroTempDays.length
        : 0;

      // AVERAGE of daily averages for Static Pressure (only non-zero days)
      const nonZeroPressureDays = dailySummaries.filter(day => day.avgPressure !== 0);
      const grandAvgPressure = nonZeroPressureDays.length > 0
        ? nonZeroPressureDays.reduce((sum, day) => sum + day.avgPressure, 0) / nonZeroPressureDays.length
        : 0;

      // AVERAGE of daily averages for Differential Pressure (only non-zero days)
      const nonZeroDiffPressureDays = dailySummaries.filter(day => day.avgDiffPressure !== 0);
      const grandAvgDiffPressure = nonZeroDiffPressureDays.length > 0
        ? nonZeroDiffPressureDays.reduce((sum, day) => sum + day.avgDiffPressure, 0) / nonZeroDiffPressureDays.length
        : 0;

      // Create worksheet with styled headers
      const worksheet = XLSX.utils.aoa_to_sheet([]);

      // Define styles
      const darkRedHeaderStyle = {
        fill: { fgColor: { rgb: '8B0000' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const columnHeaderStyle = {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        font: { color: { rgb: '8B0000' }, bold: true, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };

      const dataStyle = {
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const totalRowStyle = {
        fill: { fgColor: { rgb: 'FFFF00' } },
        font: { bold: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      // Device name for title
      const deviceName = selectedDevice.device_name || selectedDevice.client_id;

      // Row 1: Main title with device name (dark red background)
      worksheet['A1'] = {
        v: `DAILY VOLUME OF ${deviceName.toUpperCase()}`,
        s: darkRedHeaderStyle
      };

      // Row 2: Empty row
      // Row 3: Column headers
      const headers = [
        'Sr. No.', 'Date', 'Time', 'Flow Time (hrs)', 'Diff Pressure (IWC)',
        'Static Pressure (PSI)', 'Temperature (°F)', 'Volume (MCF)',
        'Energy', 'Specific Gravity'
      ];
      headers.forEach((header, idx) => {
        const col = String.fromCharCode(65 + idx); // A, B, C...
        worksheet[`${col}3`] = { v: header, s: columnHeaderStyle };
      });

      // Add data starting from row 4
      let rowNum = 4;
      excelData.forEach((row) => {
        worksheet[`A${rowNum}`] = { v: row.srNo, s: dataStyle };
        worksheet[`B${rowNum}`] = { v: row.date, s: dataStyle };
        worksheet[`C${rowNum}`] = { v: row.time, s: dataStyle };
        worksheet[`D${rowNum}`] = { v: row.flowTime, s: dataStyle };
        worksheet[`E${rowNum}`] = { v: row.diffPressure, s: dataStyle };
        worksheet[`F${rowNum}`] = { v: row.staticPressure, s: dataStyle };
        worksheet[`G${rowNum}`] = { v: row.temperature, s: dataStyle };
        worksheet[`H${rowNum}`] = { v: row.volume, s: dataStyle };
        worksheet[`I${rowNum}`] = { v: row.energy, s: dataStyle };
        worksheet[`J${rowNum}`] = { v: row.specificGravity, s: dataStyle };
        rowNum++;
      });

      // Add total/average row with yellow background
      // SUM for Volume and Energy, AVERAGE of non-zero values for Temp, Pressure, Diff Pressure
      worksheet[`A${rowNum}`] = { v: '', s: totalRowStyle };
      worksheet[`B${rowNum}`] = { v: 'TOTAL/AVG', s: totalRowStyle };
      worksheet[`C${rowNum}`] = { v: '', s: totalRowStyle };
      worksheet[`D${rowNum}`] = { v: '', s: totalRowStyle };
      worksheet[`E${rowNum}`] = { v: grandAvgDiffPressure.toFixed(2), s: totalRowStyle };
      worksheet[`F${rowNum}`] = { v: grandAvgPressure.toFixed(1), s: totalRowStyle };
      worksheet[`G${rowNum}`] = { v: grandAvgTemp.toFixed(1), s: totalRowStyle };
      worksheet[`H${rowNum}`] = { v: grandTotalVolume.toFixed(3), s: totalRowStyle };
      worksheet[`I${rowNum}`] = { v: grandTotalEnergy.toFixed(2), s: totalRowStyle };
      worksheet[`J${rowNum}`] = { v: '', s: totalRowStyle };

      // Set the range of the worksheet
      worksheet['!ref'] = `A1:J${rowNum}`;

      // Set column widths
      worksheet['!cols'] = [
        { wch: 8 },   // Sr. No.
        { wch: 12 },  // Date
        { wch: 8 },   // Time
        { wch: 14 },  // Flow Time
        { wch: 18 },  // Diff Pressure
        { wch: 18 },  // Static Pressure
        { wch: 16 },  // Temperature
        { wch: 14 },  // Volume
        { wch: 10 },  // Energy
        { wch: 14 },  // Specific Gravity
      ];

      // Set row heights
      worksheet['!rows'] = [
        { hpt: 30 },  // Row 1: Title
        { hpt: 15 },  // Row 2: Empty
        { hpt: 35 },  // Row 3: Column headers
      ];

      // Merge title cells
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Title row 1
      ];

      const workbook = XLSX.utils.book_new();
      const sheetName = reportType === 'custom' ? 'Custom Report' : `${reportType === '15days' ? '15' : '30'} Days Report`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const filename = `${selectedDevice.client_id}_6AM_Report_${formatDateShort(startDate)}_to_${formatDateShort(endDate)}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success(`Report generated successfully! (${dailySummaries.length} days of data)`);
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
                    value={sectionComparisonType}
                    onChange={(e) => setSectionComparisonType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15days">Mid-Month (1st-15th) vs Previous Month</option>
                    <option value="30days">Full Month vs Previous Month</option>
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
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Monthly Data Report</h3>
                  <p className="text-green-100 mt-1">{selectedDevice?.device_name || selectedDevice?.client_id}</p>
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 mb-1">Daily 6 AM Readings Report</h4>
                    <p className="text-sm text-green-700">
                      Download raw data with one reading per day (6 AM) for device <strong>{selectedDevice?.client_id}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Report Duration Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Select Report Duration
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {/* 15 Days Report */}
                  <div
                    onClick={() => setReportType('15days')}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      reportType === '15days'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="mt-1">
                      {reportType === '15days' ? (
                        <CheckSquare className="w-6 h-6 text-green-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg mb-1">15 Days Report</div>
                      <p className="text-sm text-gray-600">
                        Download <strong>15 days</strong> of data with one 6 AM reading per day
                      </p>
                    </div>
                  </div>

                  {/* 30 Days Report */}
                  <div
                    onClick={() => setReportType('30days')}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      reportType === '30days'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="mt-1">
                      {reportType === '30days' ? (
                        <CheckSquare className="w-6 h-6 text-green-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg mb-1">30 Days Report</div>
                      <p className="text-sm text-gray-600">
                        Download <strong>30 days</strong> of data with one 6 AM reading per day
                      </p>
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div
                    onClick={() => setReportType('custom')}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      reportType === 'custom'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow'
                    }`}
                  >
                    <div className="mt-1">
                      {reportType === 'custom' ? (
                        <CheckSquare className="w-6 h-6 text-green-600" />
                      ) : (
                        <Square className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg mb-1">Custom Date Range</div>
                      <p className="text-sm text-gray-600 mb-3">
                        Select your own start and end dates
                      </p>
                      {reportType === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data included info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Report includes:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Flow Time</div>
                  <div className="flex items-center gap-1"><Wind className="w-3 h-3" /> Diff Pressure</div>
                  <div className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Static Pressure</div>
                  <div className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature</div>
                  <div className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Volume</div>
                  <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Energy & Sp. Gravity</div>
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
                  disabled={generatingReport || (reportType === 'custom' && (!customStartDate || !customEndDate))}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Downloading Data...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download {reportType === 'custom' ? 'Custom' : reportType === '15days' ? '15 Days' : '30 Days'} Report
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
