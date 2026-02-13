import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAlarms, acknowledgeAlarm, deleteAlarm } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Clock, ArrowLeft, Trash2 } from 'lucide-react';

const SectionAlarms = () => {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    acknowledged: 0
  });

  // Section info mapping
  const sectionInfo = {
    'I': { name: 'Section I - Multan/BWP/Sahiwal', color: 'from-blue-600 to-blue-700' },
    'II': { name: 'Section II', color: 'from-green-600 to-green-700' },
    'III': { name: 'Section III', color: 'from-purple-600 to-purple-700' },
    'IV': { name: 'Section IV', color: 'from-orange-600 to-orange-700' },
    'V': { name: 'Section V', color: 'from-pink-600 to-pink-700' },
  };

  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [sectionId]);

  const fetchAlarms = async () => {
    try {
      const data = await getAlarms({ limit: 1000 });
      // Filter alarms for this section
      const sectionAlarms = data.filter(alarm =>
        alarm.client_id?.startsWith(`SMS-${sectionId}-`)
      );
      setAlarms(sectionAlarms);

      // Calculate stats
      const stats = {
        total: sectionAlarms.length,
        high: sectionAlarms.filter(a => a.severity === 'high').length,
        medium: sectionAlarms.filter(a => a.severity === 'medium').length,
        low: sectionAlarms.filter(a => a.severity === 'low').length,
        acknowledged: sectionAlarms.filter(a => a.is_acknowledged).length
      };
      setStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alarms:', error);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alarmId) => {
    try {
      await acknowledgeAlarm(alarmId);
      toast.success('Alarm acknowledged successfully');
      fetchAlarms();
    } catch (error) {
      toast.error('Failed to acknowledge alarm');
    }
  };

  const handleDelete = async (alarmId) => {
    try {
      await deleteAlarm(alarmId);
      toast.success('Alarm deleted successfully');
      fetchAlarms();
    } catch (error) {
      toast.error('Failed to delete alarm');
    }
  };

  // Color indicator functions - matching Station Detail chart colors
  const getTemperatureColor = (temp) => {
    if (temp < 0) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    if (temp < 10) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200' };
    if (temp <= 120) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
  };

  const getStaticPressureColor = (pressure) => {
    if (pressure < 10) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
    if (pressure <= 90) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
    if (pressure <= 120) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
  };

  const getDifferentialPressureColor = (pressure) => {
    if (pressure < 0) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
    if (pressure <= 300) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
    if (pressure <= 400) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200' };
    return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
  };

  const getBatteryColor = (voltage) => {
    if (voltage < 10) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    if (voltage < 10.5) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-200' };
    if (voltage <= 14) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
  };

  const getVolumeColor = (volume) => {
    if (volume < 3000) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    if (volume < 4000) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
  };

  const getGravityColor = (gravity) => {
    if (gravity < 0.58) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    if (gravity > 0.69) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
  };

  const getSeverityColor = (alarm) => {
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
        case 'specific_gravity':
        case 'gravity':
          return getGravityColor(value);
        default:
          break;
      }
    }

    const severity = typeof alarm === 'string' ? alarm : alarm.severity;

    if (severity === 'high') {
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', icon: 'text-red-500', bgSolid: 'bg-red-100' };
    } else if (severity === 'medium') {
      return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', icon: 'text-yellow-500', bgSolid: 'bg-yellow-100' };
    }
    return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', icon: 'text-green-500', bgSolid: 'bg-green-100' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-400">Loading alarms...</p>
        </div>
      </Layout>
    );
  }

  const section = sectionInfo[sectionId] || { name: `Section ${sectionId}`, color: 'from-gray-600 to-gray-700' };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/alarms')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className={`w-16 h-16 bg-gradient-to-br ${section.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                <span className="text-2xl font-bold">{sectionId}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{section.name}</h1>
                <p className="text-gray-600">Alarm Management</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Alarms</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Critical</div>
              <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">High</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Low</div>
              <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
            </div>
            <div className="glass rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Acknowledged</div>
              <div className="text-2xl font-bold text-green-600">{stats.acknowledged}</div>
            </div>
          </div>
        </div>

        {/* Alarms Table */}
        <div className="glass rounded-xl p-6">
          {alarms.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear</h3>
              <p className="text-gray-600">No active alarms for this section</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Device ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parameter</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Severity</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alarms.map((alarm) => {
                    const severityColor = getSeverityColor(alarm);
                    return (
                      <tr key={alarm.id} className={`hover:bg-gray-50 ${alarm.is_acknowledged ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{alarm.client_id || 'Unknown'}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-gray-700">{alarm.parameter?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`font-bold ${severityColor.text}`}>
                            {alarm.value?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${severityColor.bgSolid} ${severityColor.text}`}>
                            {alarm.severity}
                          </span>
                          {alarm.is_acknowledged && (
                            <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{alarm.message}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <div>
                              <div>{new Date(alarm.triggered_at).toLocaleTimeString()}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(alarm.triggered_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {!alarm.is_acknowledged && (
                              <button
                                onClick={() => handleAcknowledge(alarm.id)}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
                                title="Acknowledge"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(alarm.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-sm font-medium"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </Layout>
  );
};

export default SectionAlarms;
