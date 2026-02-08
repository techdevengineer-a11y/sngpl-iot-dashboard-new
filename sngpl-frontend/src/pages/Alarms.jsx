import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlarms, getAlarmsBySection, acknowledgeAlarm, deleteAlarm, deleteAllAlarms, getAlarmMonitoringStatus, toggleAlarmMonitoring } from '../services/api';
import Layout from '../components/Layout';
import SectionCards from '../components/SectionCards';
import toast from 'react-hot-toast';
import { Bell, AlertTriangle, CheckCircle, Clock, Activity, Trash2, PlayCircle, StopCircle, Gauge, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';

const Alarms = () => {
  const navigate = useNavigate();
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
      const data = await getAlarmsBySection();
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
    navigate(`/alarms/${sectionId}`);
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

        {/* Section Overview Cards */}
        <SectionCards onSectionClick={(sectionId) => navigate(`/alarms/${sectionId}`)} />

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </Layout>
  );
};

export default Alarms;
