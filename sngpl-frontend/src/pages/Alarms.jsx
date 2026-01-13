import { useState, useEffect } from 'react';
import { getAlarms, acknowledgeAlarm, deleteAlarm, deleteAllAlarms, getAlarmMonitoringStatus, toggleAlarmMonitoring } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { Bell, AlertTriangle, CheckCircle, Clock, Activity, Trash2, PlayCircle, StopCircle, Gauge, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';

const Alarms = () => {
  const [sectionData, setSectionData] = useState([]);
  const [allAlarms, setAllAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    fetchData();
    fetchMonitoringStatus();
    const interval = setInterval(() => {
      fetchData();
      fetchMonitoringStatus();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch section-based alarm data
      const response = await fetch('/api/alarms/by-section');
      const data = await response.json();
      setSectionData(data.sections || []);

      // Fetch all alarms for detail view
      const alarmsData = await getAlarms({ limit: 1000 });
      setAllAlarms(alarmsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alarm data:', error);
      setLoading(false);
    }
  };

  const fetchMonitoringStatus = async () => {
    try {
      const status = await getAlarmMonitoringStatus();
      setMonitoringEnabled(status.enabled);
    } catch (error) {
      console.error('Error fetching monitoring status:', error);
    }
  };

  const handleAcknowledge = async (alarmId) => {
    try {
      await acknowledgeAlarm(alarmId);
      toast.success('Alarm acknowledged successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to acknowledge alarm');
    }
  };

  const handleDelete = async (alarmId) => {
    if (!window.confirm('Are you sure you want to delete this alarm?')) {
      return;
    }
    try {
      await deleteAlarm(alarmId);
      toast.success('Alarm deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete alarm');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL alarms? This action cannot be undone.')) {
      return;
    }
    try {
      const result = await deleteAllAlarms();
      toast.success(result.message || 'All alarms deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete all alarms');
    }
  };

  const handleToggleMonitoring = async () => {
    try {
      const result = await toggleAlarmMonitoring();
      setMonitoringEnabled(result.enabled);
      if (result.enabled) {
        toast.success('Alarm monitoring started');
      } else {
        toast.success('Alarm monitoring stopped');
      }
    } catch (error) {
      toast.error('Failed to toggle alarm monitoring');
    }
  };

  const handleSectionClick = (sectionId) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null); // Collapse if already expanded
    } else {
      setExpandedSection(sectionId); // Expand the clicked section
    }
  };

  // Color indicator functions - matching Station Detail chart colors
  const getTemperatureColor = (temp) => {
    if (temp < 0) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100', status: 'V.Low', severity: 'high' };
    if (temp < 10) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200', status: 'Low', severity: 'high' };
    if (temp <= 120) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100', status: 'Normal', severity: 'low' };
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100', status: 'High', severity: 'medium' };
  };

  const getStaticPressureColor = (pressure) => {
    if (pressure < 10) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100', status: 'V.Low', severity: 'medium' };
    if (pressure <= 90) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100', status: 'Normal', severity: 'low' };
    if (pressure <= 120) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200', status: 'High', severity: 'high' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100', status: 'V.High', severity: 'high' };
  };

  const getDifferentialPressureColor = (pressure) => {
    if (pressure < 0) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100', status: 'V.Low', severity: 'medium' };
    if (pressure <= 300) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100', status: 'Normal', severity: 'low' };
    if (pressure <= 400) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200', status: 'High', severity: 'high' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100', status: 'V.High', severity: 'high' };
  };

  const getBatteryColor = (voltage) => {
    if (voltage < 10) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100', status: 'V.Low', severity: 'high' };
    if (voltage < 10.5) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200', status: 'Low', severity: 'high' };
    if (voltage <= 14) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100', status: 'Normal', severity: 'low' };
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100', status: 'High', severity: 'medium' };
  };

  const getVolumeColor = (volume) => {
    if (volume < 3000) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100', status: 'Danger', severity: 'high' };
    if (volume < 4000) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100', status: 'Warning', severity: 'medium' };
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100', status: 'Normal', severity: 'low' };
  };

  // Get color based on alarm parameter type and value
  const getSeverityColor = (alarm) => {
    // If alarm has parameter type and value, use parameter-specific colors
    if (alarm.parameter && alarm.value !== null && alarm.value !== undefined) {
      const value = parseFloat(alarm.value);

      switch (alarm.parameter.toLowerCase()) {
        case 'temperature':
          return getTemperatureColor(value);
        case 'static_pressure':
        case 'pressure':
          return getStaticPressureColor(value);
        case 'differential_pressure':
        case 'diff_pressure':
          return getDifferentialPressureColor(value);
        case 'battery':
        case 'battery_voltage':
          return getBatteryColor(value);
        case 'volume':
        case 'volume_flow':
        case 'total_volume_flow':
          return getVolumeColor(value);
        default:
          // Fall back to severity-based colors
          break;
      }
    }

    // Fallback to severity-based colors if parameter info not available
    // If alarm is an object with severity property, use alarm.severity
    const severity = typeof alarm === 'string' ? alarm : alarm.severity;

    if (severity === 'high') {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-600',
        icon: 'text-red-500',
        bgSolid: 'bg-red-100'
      };
    } else if (severity === 'medium') {
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-600',
        icon: 'text-yellow-500',
        bgSolid: 'bg-yellow-100'
      };
    }
    return {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-600',
      icon: 'text-green-500',
      bgSolid: 'bg-green-100'
    };
  };

  // Section colors matching the Sections page
  const sectionColors = [
    'from-blue-600 to-blue-700',
    'from-green-600 to-green-700',
    'from-purple-600 to-purple-700',
    'from-orange-600 to-orange-700',
    'from-pink-600 to-pink-700',
  ];

  const getSectionColor = (index) => {
    return sectionColors[index % sectionColors.length];
  };

  const getAlarmsForSection = (sectionId) => {
    return allAlarms.filter(alarm => alarm.client_id?.startsWith(`SMS-${sectionId}-`));
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-400">Loading alarm data...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="w-8 h-8" />
              Alarm Monitoring System
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleMonitoring}
                className={`px-5 py-2.5 rounded-lg transition-all duration-200 font-semibold hover:scale-105 flex items-center gap-2 ${
                  monitoringEnabled
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {monitoringEnabled ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Start Monitoring
                  </>
                )}
              </button>
              {allAlarms.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-semibold hover:scale-105 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Alarms
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section Cards Grid - 5 Cards Only */}
        {sectionData.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Section Data Available</h3>
            <p className="text-gray-600">Waiting for section data to load...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectionData.map((section, index) => {
            const sectionAlarms = getAlarmsForSection(section.section_id);
            const offlineDevices = section.total_devices - section.active_devices;
            const isExpanded = expandedSection === section.section_id;

            return (
              <div
                key={section.section_id}
                className="glass rounded-xl p-6 transition-all duration-300"
              >
                {/* Clickable Card Header */}
                <div
                  onClick={() => handleSectionClick(section.section_id)}
                  className="cursor-pointer hover:scale-105 transition-all duration-300"
                >
                  {/* Header with Section Number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${getSectionColor(index)} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <span className="text-2xl font-bold">{section.section_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Active Alarms</div>
                      <div className={`text-3xl font-bold ${section.active_alarms > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {section.active_alarms}
                      </div>
                      <div className="text-xs text-gray-600">
                        {section.high_severity_alarms > 0 && `${section.high_severity_alarms} High`}
                        {section.high_severity_alarms > 0 && section.medium_severity_alarms > 0 && ' | '}
                        {section.medium_severity_alarms > 0 && `${section.medium_severity_alarms} Med`}
                      </div>
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
                      <div className="text-2xl font-bold text-gray-900">{section.total_devices}</div>
                    </div>

                    {/* Offline Devices */}
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <WifiOff className="w-4 h-4 text-red-600" />
                        <div className="text-xs text-gray-600">Offline</div>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
                    </div>

                    {/* High Severity Alarms */}
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <div className="text-xs text-gray-600">High</div>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{section.high_severity_alarms}</div>
                    </div>

                    {/* Medium Severity Alarms */}
                    <div className="bg-yellow-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-yellow-600" />
                        <div className="text-xs text-gray-600">Medium</div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">{section.medium_severity_alarms}</div>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                    <span className="text-sm text-gray-600">
                      {sectionAlarms.length} alarm{sectionAlarms.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Alarms Table */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gray-300 pt-4 animate-in slide-in-from-top duration-300">
                    {sectionAlarms.length === 0 ? (
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-600">All Clear</p>
                        <p className="text-xs text-gray-600">No active alarms</p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-left text-gray-700 font-semibold">Device</th>
                              <th className="px-2 py-2 text-left text-gray-700 font-semibold">Parameter</th>
                              <th className="px-2 py-2 text-left text-gray-700 font-semibold">Value</th>
                              <th className="px-2 py-2 text-left text-gray-700 font-semibold">Severity</th>
                              <th className="px-2 py-2 text-left text-gray-700 font-semibold">Time</th>
                              <th className="px-2 py-2 text-center text-gray-700 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sectionAlarms.map((alarm) => {
                              const severityColor = getSeverityColor(alarm);
                              return (
                                <tr key={alarm.id} className={`hover:bg-gray-50 ${alarm.is_acknowledged ? 'opacity-60' : ''}`}>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className="font-medium text-gray-900">{alarm.client_id || 'Unknown'}</span>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className="text-gray-700">{alarm.parameter?.replace(/_/g, ' ')}</span>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className={`font-bold ${severityColor.text}`}>
                                      {alarm.value?.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${severityColor.bgSolid} ${severityColor.text}`}>
                                      {alarm.severity}
                                    </span>
                                    {alarm.is_acknowledged && (
                                      <CheckCircle className="w-3 h-3 text-green-600 inline ml-1" />
                                    )}
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(alarm.triggered_at).toLocaleTimeString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(alarm.triggered_at).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                      {!alarm.is_acknowledged && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcknowledge(alarm.id);
                                          }}
                                          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
                                          title="Acknowledge"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(alarm.id);
                                        }}
                                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
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
                )}
              </div>
            );
          })}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </Layout>
  );
};

export default Alarms;
