import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Gauge, Activity } from 'lucide-react';

interface Section {
  section_id: string;
  section_name: string;
  sms_count: number;
  active_sms: number;
  cumulative_volume_flow: number;
  unit: string;
}

interface SectionStats {
  sections: Section[];
  all_sms: Section;
  timestamp: string;
}

const SystemToolbox = () => {
  const [sectionStats, setSectionStats] = useState<SectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSectionStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSectionStats, 30000);
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

  const handleSectionClick = (sectionId: string) => {
    navigate(`/sections/${sectionId}`);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          System Toolbox
        </h2>
        <div className="text-center py-8 text-gray-500">Loading sections...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
        <Building2 className="w-6 h-6" />
        System Toolbox
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 5 Individual Sections */}
        {sectionStats?.sections.map((section) => (
          <button
            key={section.section_id}
            onClick={() => handleSectionClick(section.section_id)}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20
                     border border-blue-200 dark:border-blue-700 rounded-lg p-4
                     hover:shadow-lg hover:scale-105 transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {section.section_name}
              </h3>
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {section.sms_count} SMS Devices
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {section.active_sms} Active
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {section.cumulative_volume_flow.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {section.unit}
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* All SMS Summary Card */}
        {sectionStats?.all_sms && (
          <button
            onClick={() => handleSectionClick('ALL')}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20
                     border-2 border-purple-300 dark:border-purple-600 rounded-lg p-4
                     hover:shadow-lg hover:scale-105 transition-all duration-200 text-left
                     md:col-span-2 lg:col-span-1"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                {sectionStats.all_sms.section_name}
              </h3>
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {sectionStats.all_sms.sms_count} Total SMS Devices
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {sectionStats.all_sms.active_sms} Active
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {sectionStats.all_sms.cumulative_volume_flow.toFixed(2)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  {sectionStats.all_sms.unit} (Total)
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {sectionStats?.timestamp ? new Date(sectionStats.timestamp).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
};

export default SystemToolbox;
