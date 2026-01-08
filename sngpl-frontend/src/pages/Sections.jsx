import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ExportModal from '../components/ExportModal';
import { Building2, Gauge, Activity, WifiOff, TrendingUp, AlertTriangle, Download } from 'lucide-react';

const Sections = () => {
  const navigate = useNavigate();
  const [sectionStats, setSectionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    fetchSectionStats();
    // Refresh every 10 seconds for smooth updates
    const interval = setInterval(fetchSectionStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSectionStats = async () => {
    try {
      const response = await fetch('/api/sections/stats');
      if (response.ok) {
        const data = await response.json();
        setSectionStats(data);
      }
    } catch (error) {
      console.error('Error fetching section stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = (sectionId) => {
    navigate(`/sections/${sectionId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-400">Loading sections...</p>
        </div>
      </Layout>
    );
  }

  // Section colors
  const sectionColors = [
    'from-blue-600 to-blue-700',
    'from-green-600 to-green-700',
    'from-purple-600 to-purple-700',
    'from-orange-600 to-orange-700',
    'from-pink-600 to-pink-700',
  ];

  // Default sections if no data from API
  const defaultSections = [
    { section_id: 'I', section_name: 'Section I - Multan/BWP/Sahiwal', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
    { section_id: 'II', section_name: 'Section II', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
    { section_id: 'III', section_name: 'Section III', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
    { section_id: 'IV', section_name: 'Section IV', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
    { section_id: 'V', section_name: 'Section V', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
  ];

  const defaultAllSms = {
    section_id: 'ALL',
    section_name: 'All SMS',
    sms_count: 0,
    active_sms: 0,
    cumulative_volume_flow: 0,
    unit: 'MCF/day'
  };

  // Use API data if available, otherwise use defaults
  const sections = sectionStats?.sections || defaultSections;
  const allSms = sectionStats?.all_sms || defaultAllSms;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              Sections Overview
            </h1>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <Download className="w-5 h-5" />
              <span>Export All 400 Devices</span>
            </button>
          </div>
        </div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cards 1-5: Individual Sections */}
          {sections.map((section, index) => {
            const offlineDevices = section.sms_count - section.active_sms;
            // Mock alarm data - will be replaced with real API data
            const devicesWithAlarms = Math.floor(Math.random() * section.sms_count * 0.2);

            return (
              <div
                key={section.section_id}
                onClick={() => handleSectionClick(section.section_id)}
                className="glass rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                {/* Header with Section Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${sectionColors[index]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                    <span className="text-2xl font-bold">{section.section_id}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total Flow</div>
                    <div className="text-3xl font-bold text-cyan-600">{section.cumulative_volume_flow.toFixed(1)}</div>
                    <div className="text-xs text-gray-600">{section.unit}</div>
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

                  {/* Devices with Alarms */}
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <div className="text-xs text-gray-600">Alarms</div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{devicesWithAlarms}</div>
                  </div>

                  {/* Online Devices */}
                  <div className="bg-green-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-green-600" />
                      <div className="text-xs text-gray-600">Online</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{section.active_sms}</div>
                  </div>
                </div>

                {/* View Details Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                  <span className="text-sm text-gray-600">View SMS Devices</span>
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}

          {/* Card 6: Total Devices Across All Sections */}
          <div className="glass rounded-xl p-6 bg-gradient-to-br from-purple-50 to-blue-50">
            {/* Header with Total Icon */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total Flow</div>
                <div className="text-3xl font-bold text-cyan-600">{allSms.cumulative_volume_flow.toFixed(1)}</div>
                <div className="text-xs text-gray-600">MCF/day</div>
              </div>
            </div>

            {/* Section Name */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">Total Devices</h2>

            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Total Devices */}
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{allSms.sms_count}</div>
              </div>

              {/* Offline Devices */}
              <div className="bg-red-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <div className="text-xs text-gray-600">Offline</div>
                </div>
                <div className="text-2xl font-bold text-red-600">{allSms.sms_count - allSms.active_sms}</div>
              </div>

              {/* Devices with Alarms */}
              <div className="bg-yellow-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <div className="text-xs text-gray-600">Alarms</div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {sections.filter(s => s.section_id !== 'OTHER').reduce((sum, section) => sum + Math.floor(Math.random() * section.sms_count * 0.2), 0)}
                </div>
              </div>

              {/* Online Devices */}
              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-gray-600">Online</div>
                </div>
                <div className="text-2xl font-bold text-green-600">{allSms.active_sms}</div>
              </div>
            </div>

            {/* View Details Info */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-300">
              <span className="text-sm text-gray-600">Across All Sections</span>
              <span className="text-xs text-gray-600 bg-purple-100 px-2 py-1 rounded">Sections I-V</span>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {sectionStats?.timestamp ? new Date(sectionStats.timestamp).toLocaleString() : 'N/A'}
        </div>
      </div>

      {/* Export Modal for All Devices */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        exportType="all"
      />
    </Layout>
  );
};

export default Sections;
