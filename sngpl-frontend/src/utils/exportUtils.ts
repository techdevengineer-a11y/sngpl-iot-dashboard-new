/**
 * Utility functions for exporting data in various formats
 */

export interface ExportData {
  timestamp: string;
  [key: string]: string | number;
}

/**
 * Export data as CSV
 */
export const exportToCSV = (data: ExportData[], filename: string) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export data as JSON
 */
export const exportToJSON = (data: ExportData[], filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
};

/**
 * Export data as Excel (simple XML format)
 */
export const exportToExcel = (data: ExportData[], filename: string) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);

  // Create Excel XML content
  const excelContent = `
<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Data">
  <Table>
   <Row>
    ${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('\n    ')}
   </Row>
   ${data.map(row => `
   <Row>
    ${headers.map(h => {
      const value = row[h];
      const type = typeof value === 'number' ? 'Number' : 'String';
      return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
    }).join('\n    ')}
   </Row>`).join('\n  ')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
};

/**
 * Generate PDF report (basic HTML to PDF approach)
 */
export const exportToPDF = (data: ExportData[], filename: string, title: string = 'Report') => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);

  // Create HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #0066cc; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .meta { color: #666; font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
  <div class="meta">Total Records: ${data.length}</div>

  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
      <tr>
        ${headers.map(h => `<td>${row[h]}</td>`).join('\n        ')}
      </tr>`).join('\n      ')}
    </tbody>
  </table>
</body>
</html>`;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

/**
 * Helper function to download blob
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Format device data for export
 */
export const formatDeviceDataForExport = (
  deviceName: string,
  readings: any[],
  timeRange: string
): ExportData[] => {
  return readings.map(reading => ({
    timestamp: new Date(reading.timestamp).toLocaleString(),
    device: deviceName,
    temperature: parseFloat(reading.temperature?.toFixed(2) || '0'),
    static_pressure: parseFloat(reading.static_pressure?.toFixed(2) || '0'),
    differential_pressure: parseFloat(reading.differential_pressure?.toFixed(2) || '0'),
    volume: parseFloat(reading.volume?.toFixed(2) || '0'),
    total_volume_flow: parseFloat(reading.total_volume_flow?.toFixed(2) || '0'),
  }));
};

/**
 * Export station summary report
 */
export const exportStationSummary = (
  stationData: any,
  format: 'csv' | 'excel' | 'pdf',
  timeRange: string
) => {
  const filename = `station_${stationData.client_id}_${timeRange}_${Date.now()}`;
  const title = `Station Report: ${stationData.device_name || stationData.client_id}`;

  const summaryData: ExportData[] = [{
    'Station ID': stationData.client_id,
    'Device Name': stationData.device_name || 'N/A',
    'Location': stationData.location || 'N/A',
    'Status': stationData.status || 'Unknown',
    'Last Seen': stationData.last_seen ? new Date(stationData.last_seen).toLocaleString() : 'Never',
    'Temperature (°F)': stationData.latest_reading?.temperature?.toFixed(2) || 'N/A',
    'Static Pressure (PSI)': stationData.latest_reading?.static_pressure?.toFixed(2) || 'N/A',
    'Differential Pressure (IWC)': stationData.latest_reading?.differential_pressure?.toFixed(2) || 'N/A',
    'Volume': stationData.latest_reading?.volume?.toFixed(2) || 'N/A',
    'Total Volume Flow (m³)': stationData.latest_reading?.total_volume_flow?.toFixed(2) || 'N/A',
  }];

  switch (format) {
    case 'csv':
      exportToCSV(summaryData, filename);
      break;
    case 'excel':
      exportToExcel(summaryData, filename);
      break;
    case 'pdf':
      exportToPDF(summaryData, filename, title);
      break;
  }
};
