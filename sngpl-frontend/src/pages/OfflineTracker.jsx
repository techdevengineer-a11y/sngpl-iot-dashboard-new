import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { WifiOff, ArrowLeft, XCircle, RefreshCw } from 'lucide-react';

const OfflineTracker = () => {
  const navigate = useNavigate();
  const [sectionData, setSectionData] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const refreshInterval = useRef(null);
  const clockInterval = useRef(null);

  useEffect(() => {
    fetchData();

    // Auto-refresh device data every 10 seconds
    refreshInterval.current = setInterval(fetchData, 10000);

    // Update clock every second for live duration
    clockInterval.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (clockInterval.current) clearInterval(clockInterval.current);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [sectionsRes, devicesRes] = await Promise.all([
        fetch('/api/sections/stats'),
        fetch('/api/devices/')
      ]);

      if (sectionsRes.ok) {
        const sectionsJson = await sectionsRes.json();
        setSectionData(sectionsJson.sections || []);
      }

      if (devicesRes.ok) {
        const devicesJson = await devicesRes.json();
        setAllDevices(Array.isArray(devicesJson) ? devicesJson : []);
      }
    } catch (error) {
      console.error('Error fetching offline tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Compute offline devices from allDevices
  const offlineDevices = allDevices.filter(d => !d.is_active);
  const totalOffline = offlineDevices.length;

  // Sections affected
  const sectionsAffected = new Set(offlineDevices.map(d => d.section_id)).size;

  // Longest offline duration
  const getLongestOffline = () => {
    if (offlineDevices.length === 0) return 'N/A';
    let longest = 0;
    offlineDevices.forEach(d => {
      if (d.last_seen) {
        const diff = currentTime - new Date(d.last_seen);
        if (diff > longest) longest = diff;
      }
    });
    if (longest === 0) return 'N/A';
    return formatDuration(longest);
  };

  const formatDuration = (ms) => {
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ');
  };

  // Get section offline count
  const getSectionOfflineCount = (section) => {
    const sectionDevices = allDevices.filter(d => d.section_id === section.section_id);
    const offline = sectionDevices.filter(d => !d.is_active);
    return { offline: offline.length, total: sectionDevices.length };
  };

  // Get offline devices for selected section
  const getSelectedSectionDevices = () => {
    if (!selectedSection) return [];
    return allDevices
      .filter(d => d.section_id === selectedSection.section_id && !d.is_active)
      .sort((a, b) => {
        const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return aTime - bTime; // oldest first = longest offline first
      });
  };

  // AI Diagnostic logic
  const getDiagnosis = (device) => {
    const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
    const diffHours = lastSeen ? (currentTime - lastSeen) / (1000 * 60 * 60) : 9999;
    const battery = device.latest_reading?.battery || 0;
    const temp = device.latest_reading?.temperature || 0;

    if (battery > 0 && battery < 11.0) {
      return { icon: '\uD83D\uDD0B', reason: 'Low battery voltage \u2014 may have shut down', severity: 'high' };
    }
    if (diffHours > 168) {
      return { icon: '\uD83D\uDD27', reason: 'Prolonged offline \u2014 needs physical inspection', severity: 'high' };
    }
    if (diffHours > 24) {
      return { icon: '\u26A1', reason: 'Extended outage \u2014 possible power or hardware failure', severity: 'medium' };
    }
    if (temp > 150) {
      return { icon: '\uD83C\uDF21\uFE0F', reason: 'Last reading showed high temperature \u2014 possible thermal issue', severity: 'medium' };
    }

    // Check if multiple devices in same location are offline
    const sameLocationOfflineCount = offlineDevices.filter(
      d => d.location && device.location && d.location === device.location
    ).length;
    if (sameLocationOfflineCount > 1) {
      return { icon: '\uD83D\uDCE1', reason: 'Multiple devices offline in this area \u2014 possible network issue', severity: 'medium' };
    }

    return { icon: '\uD83D\uDCF6', reason: 'Communication lost \u2014 check modem connectivity', severity: 'low' };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
            <p className="mt-4 text-gray-600">Loading Offline Tracker...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedDevices = getSelectedSectionDevices();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <WifiOff className="w-7 h-7 text-red-500" />
                Offline Device Tracker
              </h1>
              <p className="text-sm text-gray-400 mt-1">Monitor and diagnose offline devices across all sections</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors border border-blue-500/30"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-xs text-red-400 mb-1">Total Offline</div>
            <div className="text-3xl font-bold text-white">{totalOffline}</div>
            <div className="text-xs text-gray-400 mt-1">devices currently offline</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="text-xs text-orange-400 mb-1">Longest Offline</div>
            <div className="text-2xl font-bold text-white">{getLongestOffline()}</div>
            <div className="text-xs text-gray-400 mt-1">max duration</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs text-purple-400 mb-1">Sections Affected</div>
            <div className="text-3xl font-bold text-white">{sectionsAffected}</div>
            <div className="text-xs text-gray-400 mt-1">out of {sectionData.length} sections</div>
          </div>
        </div>

        {/* Section Cards Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Sections</h2>
          <div className="grid grid-cols-5 gap-3">
            {sectionData.map((section, index) => {
              const counts = getSectionOfflineCount(section);
              const isSelected = selectedSection?.section_id === section.section_id;
              return (
                <motion.div
                  key={section.section_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedSection(isSelected ? null : section)}
                  className={`rounded-lg p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/60 border-gray-700/50 hover:border-gray-600/50 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">
                      {section.section_name?.replace(/Section\s+/i, 'Sec ') || section.section_id}
                    </span>
                    {counts.offline > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                        {counts.offline}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className={counts.offline > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>
                      {counts.offline}
                    </span>
                    {' / '}{counts.total} offline
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Expanded Section View */}
        <AnimatePresence>
          {selectedSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-800/60 border border-gray-700/50 rounded-lg">
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {selectedSection.section_name || selectedSection.section_id}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {selectedDevices.length} offline device{selectedDevices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Offline Devices Table */}
                {selectedDevices.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <WifiOff className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-green-400 font-medium">All devices in this section are online</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700/50">
                          <th className="text-left text-xs font-medium text-gray-400 p-3">#</th>
                          <th className="text-left text-xs font-medium text-gray-400 p-3">Device Name</th>
                          <th className="text-left text-xs font-medium text-gray-400 p-3">Location</th>
                          <th className="text-left text-xs font-medium text-gray-400 p-3">Last Seen</th>
                          <th className="text-left text-xs font-medium text-gray-400 p-3">Offline Duration</th>
                          <th className="text-left text-xs font-medium text-gray-400 p-3">AI Diagnosis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDevices.map((device, index) => {
                          const diagnosis = getDiagnosis(device);
                          const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
                          const duration = lastSeen ? currentTime - lastSeen : null;

                          return (
                            <motion.tr
                              key={device.device_id || device.client_id || index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                            >
                              <td className="p-3 text-sm text-gray-500">{index + 1}</td>
                              <td className="p-3">
                                <span className="text-sm font-medium text-white">
                                  {device.device_name || device.client_id || 'Unknown'}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-gray-400">
                                {device.location || 'N/A'}
                              </td>
                              <td className="p-3 text-sm text-gray-400">
                                {lastSeen ? lastSeen.toLocaleString() : 'Never'}
                              </td>
                              <td className="p-3">
                                <span className={`text-sm font-mono font-medium ${
                                  duration && duration > 7 * 24 * 60 * 60 * 1000 ? 'text-red-400' :
                                  duration && duration > 24 * 60 * 60 * 1000 ? 'text-yellow-400' :
                                  'text-gray-300'
                                }`}>
                                  {duration ? formatDuration(duration) : 'N/A'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${getSeverityBg(diagnosis.severity)}`}>
                                  <span className="text-sm">{diagnosis.icon}</span>
                                  <span className={`text-xs ${getSeverityColor(diagnosis.severity)}`}>
                                    {diagnosis.reason}
                                  </span>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default OfflineTracker;
