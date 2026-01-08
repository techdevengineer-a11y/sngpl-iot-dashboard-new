import { useState } from 'react';
import { X, Download, Calendar, FileSpreadsheet, Database } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId?: string;
  deviceName?: string;
  sectionId?: string;
  exportType: 'device' | 'section' | 'all';
}

const ExportModal = ({ isOpen, onClose, deviceId, deviceName, sectionId, exportType }: ExportModalProps) => {
  const [timeRange, setTimeRange] = useState<'7days' | '15days' | '30days' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 16));
  const [format, setFormat] = useState<'csv' | 'excel'>('csv');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const getDateRange = () => {
    const now = new Date();
    const end = now.toISOString();
    let start: string;

    switch (timeRange) {
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '15days':
        start = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        start = new Date(customStartDate).toISOString();
        return { start, end: new Date(customEndDate).toISOString() };
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    return { start, end };
  };

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      const { start, end } = getDateRange();
      let url = '';

      // Build API URL based on export type
      if (exportType === 'device' && deviceId) {
        url = `/api/export/device/${deviceId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&format=${format}`;
      } else if (exportType === 'section' && sectionId) {
        url = `/api/export/section/${sectionId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&format=${format}`;
      } else if (exportType === 'all') {
        url = `/api/export/all?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&format=${format}`;
      }

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export_${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'xlsx'}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      clearInterval(progressInterval);
      setProgress(100);

      // Close modal after successful export
      setTimeout(() => {
        onClose();
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getExportTitle = () => {
    if (exportType === 'device') {
      return `Export Data: ${deviceName || deviceId}`;
    } else if (exportType === 'section') {
      return `Export Section ${sectionId} Data`;
    } else {
      return 'Export All Devices Data (400 SMS Devices)';
    }
  };

  const getExportDescription = () => {
    if (exportType === 'device') {
      return 'Export historical readings for this device';
    } else if (exportType === 'section') {
      return 'Export historical readings for all devices in this section';
    } else {
      return 'Export historical readings for all 400 devices across all sections (I-V)';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">{getExportTitle()}</h2>
                <p className="text-blue-100 text-sm mt-1">{getExportDescription()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={exporting}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Time Range Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Select Time Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '7days', label: 'Last 7 Days' },
                { value: '15days', label: 'Last 15 Days' },
                { value: '30days', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as any)}
                  disabled={exporting}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    timeRange === option.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {timeRange === 'custom' && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  disabled={exporting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  disabled={exporting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                disabled={exporting}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  format === 'csv'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                CSV File
              </button>
              <button
                onClick={() => setFormat('excel')}
                disabled={exporting}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  format === 'excel'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                <Database className="w-5 h-5" />
                Excel File
              </button>
            </div>
          </div>

          {/* Export Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Exported Data Includes:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Temperature (°F)</li>
              <li>• Static Pressure (PSI)</li>
              <li>• Max Static Pressure (PSI)</li>
              <li>• Min Static Pressure (PSI)</li>
              <li>• Differential Pressure (IWC)</li>
              <li>• Volume (MCF)</li>
              <li>• Volume (MMCF)</li>
              <li>• Total Volume Flow (MCF/day)</li>
              <li>• Battery Voltage (V)</li>
              <li>• Timestamps for all readings</li>
            </ul>
          </div>

          {/* Progress Bar */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span>Exporting data...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || (timeRange === 'custom' && !customStartDate)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
