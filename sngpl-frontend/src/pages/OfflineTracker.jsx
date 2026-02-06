import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { WifiOff, ArrowLeft, XCircle, RefreshCw, Activity, MapPin, Cpu } from 'lucide-react';

const OfflineTracker = () => {
  const navigate = useNavigate();
  const [sectionData, setSectionData] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [diagnosisOpen, setDiagnosisOpen] = useState({});
  const refreshInterval = useRef(null);
  const clockInterval = useRef(null);

  useEffect(() => {
    fetchData();

    refreshInterval.current = setInterval(fetchData, 10000);

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

  const offlineDevices = allDevices.filter(d => !d.is_active);
  const totalOffline = offlineDevices.length;
  const sectionsAffected = new Set(offlineDevices.map(d => d.section_id)).size;

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

  const getSectionCounts = (section) => {
    const sectionDevices = allDevices.filter(d => d.section_id === section.section_id);
    const online = sectionDevices.filter(d => d.is_active).length;
    const offline = sectionDevices.filter(d => !d.is_active).length;
    return { online, offline, total: sectionDevices.length };
  };

  const getSelectedSectionDevices = () => {
    if (!selectedSection) return [];
    return allDevices
      .filter(d => d.section_id === selectedSection.section_id)
      .sort((a, b) => {
        // Active first, then by longest offline
        if (a.is_active !== b.is_active) return a.is_active ? 1 : -1;
        if (!a.is_active && !b.is_active) {
          const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          return aTime - bTime;
        }
        return (a.client_id || '').localeCompare(b.client_id || '');
      });
  };

  const getDiagnosis = (device) => {
    const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
    const diffHours = lastSeen ? (currentTime - lastSeen) / (1000 * 60 * 60) : 9999;
    const battery = device.latest_reading?.battery || 0;
    const temp = device.latest_reading?.temperature || 0;

    if (battery > 0 && battery < 11.0) {
      return { icon: '🔋', reason: 'Low battery voltage — may have shut down', severity: 'high' };
    }
    if (diffHours > 168) {
      return { icon: '🔧', reason: 'Prolonged offline — needs physical inspection', severity: 'high' };
    }
    if (diffHours > 24) {
      return { icon: '⚡', reason: 'Extended outage — possible power or hardware failure', severity: 'medium' };
    }
    if (temp > 150) {
      return { icon: '🌡️', reason: 'Last reading showed high temperature — possible thermal issue', severity: 'medium' };
    }

    const sameLocationOfflineCount = offlineDevices.filter(
      d => d.location && device.location && d.location === device.location
    ).length;
    if (sameLocationOfflineCount > 1) {
      return { icon: '📡', reason: 'Multiple devices offline in this area — possible network issue', severity: 'medium' };
    }

    return { icon: '📶', reason: 'Communication lost — check modem connectivity', severity: 'low' };
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const toggleDiagnosis = (deviceKey) => {
    setDiagnosisOpen(prev => ({ ...prev, [deviceKey]: !prev[deviceKey] }));
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
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <WifiOff className="w-8 h-8 text-red-500" />
                  Offline Device Tracker
                </h1>
                <p className="text-gray-400 mt-2">Monitor and diagnose offline devices across all sections</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats Row - 2 cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{totalOffline}</div>
                <div className="text-xs text-gray-600">Total Offline</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{sectionsAffected}<span className="text-sm font-normal text-gray-600"> / {sectionData.length}</span></div>
                <div className="text-xs text-gray-600">Sections Affected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Cards Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Sections</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sectionData.map((section, index) => {
              const counts = getSectionCounts(section);
              const isSelected = selectedSection?.section_id === section.section_id;
              return (
                <motion.div
                  key={section.section_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedSection(isSelected ? null : section);
                    setDiagnosisOpen({});
                  }}
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
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400">{counts.online} online</span>
                    <span className="text-gray-600">|</span>
                    <span className={counts.offline > 0 ? 'text-red-400 font-medium' : 'text-gray-400'}>
                      {counts.offline} offline
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Expanded Section View - SectionDetail style table */}
        <AnimatePresence>
          {selectedSection && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {selectedSection.section_name || selectedSection.section_id}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedDevices.length} devices — {selectedDevices.filter(d => !d.is_active).length} offline
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedSection(null); setDiagnosisOpen({}); }}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Devices Table - matching SectionDetail style */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '300px' }}>
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Last Seen</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Offline Duration</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedDevices.map((device, index) => {
                        const deviceKey = device.device_id || device.client_id || index;
                        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
                        const duration = !device.is_active && lastSeen ? currentTime - lastSeen : null;
                        const showDiagnosis = diagnosisOpen[deviceKey] && !device.is_active;
                        const diagnosis = !device.is_active ? getDiagnosis(device) : null;

                        return (
                          <tr key={deviceKey}>
                            <td colSpan={6} className="p-0">
                              {/* Main row */}
                              <div className="flex items-center hover:bg-gray-100 transition-colors">
                                {/* # */}
                                <div className="px-4 py-3 whitespace-nowrap" style={{ width: '60px' }}>
                                  <span className="text-sm font-medium text-gray-700">{index + 1}</span>
                                </div>

                                {/* Device */}
                                <div className="px-4 py-3 whitespace-nowrap flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {device.device_name || device.client_id || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-600">{device.client_id}</div>
                                  {device.location && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {device.location}
                                    </div>
                                  )}
                                </div>

                                {/* Status */}
                                <div className="px-4 py-3 whitespace-nowrap" style={{ width: '120px' }}>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    device.is_active
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    <Activity className="w-3 h-3" />
                                    {device.is_active ? 'Online' : 'Offline'}
                                  </span>
                                </div>

                                {/* Last Seen */}
                                <div className="px-4 py-3 whitespace-nowrap" style={{ width: '180px' }}>
                                  <div className="text-xs text-gray-600">
                                    {lastSeen ? lastSeen.toLocaleString() : 'Never'}
                                  </div>
                                </div>

                                {/* Offline Duration */}
                                <div className="px-4 py-3 whitespace-nowrap" style={{ width: '150px' }}>
                                  {duration ? (
                                    <span className={`text-sm font-mono font-medium ${
                                      duration > 7 * 24 * 60 * 60 * 1000 ? 'text-red-600' :
                                      duration > 24 * 60 * 60 * 1000 ? 'text-yellow-600' :
                                      'text-gray-700'
                                    }`}>
                                      {formatDuration(duration)}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-green-600 font-medium">—</span>
                                  )}
                                </div>

                                {/* Action */}
                                <div className="px-4 py-3 whitespace-nowrap text-center" style={{ width: '130px' }}>
                                  {!device.is_active ? (
                                    <button
                                      onClick={() => toggleDiagnosis(deviceKey)}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        showDiagnosis
                                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      <Cpu className="w-3.5 h-3.5" />
                                      <span>{showDiagnosis ? 'Hide' : 'Diagnose'}</span>
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </div>
                              </div>

                              {/* AI Diagnosis expandable row */}
                              <AnimatePresence>
                                {showDiagnosis && diagnosis && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className={`mx-4 mb-3 px-4 py-3 rounded-lg border ${getSeverityBg(diagnosis.severity)}`}>
                                      <div className="flex items-center gap-3">
                                        <span className="text-lg">{diagnosis.icon}</span>
                                        <div>
                                          <div className={`text-sm font-medium ${getSeverityColor(diagnosis.severity)}`}>
                                            AI Diagnosis
                                          </div>
                                          <div className="text-sm text-gray-700 mt-0.5">
                                            {diagnosis.reason}
                                          </div>
                                        </div>
                                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium uppercase ${
                                          diagnosis.severity === 'high' ? 'bg-red-100 text-red-700' :
                                          diagnosis.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {diagnosis.severity}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Empty state */}
                  {selectedDevices.length === 0 && (
                    <div className="p-12 text-center">
                      <WifiOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-white mb-2">No devices found</h3>
                      <p className="text-gray-400">This section doesn't have any devices yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default OfflineTracker;
