import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Activity, WifiOff, AlertTriangle } from 'lucide-react';

interface SectionStat {
  section_id: string;
  section_name: string;
  sms_count: number;
  active_sms: number;
  offline_sms?: number;
  alarms_count?: number;
  cumulative_volume_flow: number;
  unit: string;
}

interface SectionCardsProps {
  onSectionClick?: (sectionId: string) => void;
}

const sectionColors = [
  'from-blue-600 to-blue-700',
  'from-green-600 to-green-700',
  'from-purple-600 to-purple-700',
  'from-orange-600 to-orange-700',
  'from-pink-600 to-pink-700',
  'from-cyan-600 to-cyan-700',
];

const defaultSections: SectionStat[] = [
  { section_id: 'I', section_name: 'Section I - Multan/BWP/Sahiwal', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
  { section_id: 'II', section_name: 'Section II', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
  { section_id: 'III', section_name: 'Section III', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
  { section_id: 'IV', section_name: 'Section IV', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
  { section_id: 'V', section_name: 'Section V', sms_count: 0, active_sms: 0, cumulative_volume_flow: 0, unit: 'MCF/day' },
];

const SectionCards = ({ onSectionClick }: SectionCardsProps) => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<SectionStat[]>(defaultSections);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/sections/stats');
        if (response.ok) {
          const data = await response.json();
          setSections(data.sections || defaultSections);
        }
      } catch (error) {
        console.error('Error fetching section stats:', error);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (sectionId: string) => {
    if (onSectionClick) {
      onSectionClick(sectionId);
    } else {
      navigate(`/sections/${sectionId}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sections.map((section, index) => {
        const offlineDevices = section.offline_sms || (section.sms_count - section.active_sms);
        const devicesWithAlarms = section.alarms_count || 0;
        const isTotal = section.section_id === 'TOTAL';

        return (
          <div
            key={section.section_id}
            onClick={() => !isTotal && handleClick(section.section_id)}
            className={`glass rounded-xl p-6 transition-all duration-300 ${
              isTotal
                ? 'border-2 border-blue-500'
                : 'cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${sectionColors[index] || sectionColors[0]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                <span className="text-2xl font-bold">{section.section_id}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total Flow</div>
                <div className="text-3xl font-bold text-cyan-600">{section.cumulative_volume_flow.toFixed(1)}</div>
                <div className="text-xs text-gray-600">{section.unit}</div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">{section.section_name}</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{section.sms_count}</div>
              </div>

              <div className="bg-red-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <div className="text-xs text-gray-600">Offline</div>
                </div>
                <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
              </div>

              <div className="bg-yellow-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <div className="text-xs text-gray-600">Alarms</div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{devicesWithAlarms}</div>
              </div>

              <div className="bg-green-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-green-600" />
                  <div className="text-xs text-gray-600">Online</div>
                </div>
                <div className="text-2xl font-bold text-green-600">{section.active_sms}</div>
              </div>
            </div>

            {!isTotal && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                <span className="text-sm text-gray-600">View SMS Devices</span>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SectionCards;
