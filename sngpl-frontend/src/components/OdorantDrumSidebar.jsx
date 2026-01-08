import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplet, ChevronDown, ChevronRight, RefreshCw, Plus, History, AlertCircle, Calendar, User, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const OdorantDrumSidebar = ({ isOpen, onClose }) => {
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillNotes, setRefillNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSectionsWithDevices();
      const interval = setInterval(fetchSectionsWithDevices, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchSectionsWithDevices = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch sections stats
      const sectionsRes = await fetch('/api/sections/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!sectionsRes.ok) return;

      const sectionsData = await sectionsRes.json();
      const allSections = sectionsData.sections || [];

      // Fetch all odorant drums
      const drumsRes = await fetch('/api/odorant/drums', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const drums = drumsRes.ok ? await drumsRes.json() : [];

      // Fetch all devices
      const devicesRes = await fetch('/api/devices/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allDevices = devicesRes.ok ? await devicesRes.json() : [];

      // Group devices by section with their drum info
      const sectionsWithDevices = allSections.map(section => {
        const sectionDevices = allDevices
          .filter(d => d.section_id === section.id)
          .map(device => {
            const drum = drums.find(dr => dr.device_id === device.id);
            return {
              ...device,
              drum,
              cumulative_volume_flow: device.cumulative_volume_flow || 0,
              mmcf: device.mmcf || (device.cumulative_volume_flow || 0) / 1000
            };
          });

        return {
          ...section,
          devices: sectionDevices,
          totalDevices: sectionDevices.length,
          activeDevices: sectionDevices.filter(d => d.is_active).length,
          drumsConfigured: sectionDevices.filter(d => d.drum).length
        };
      });

      setSections(sectionsWithDevices);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchHistory = async (drumId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/odorant/drums/${drumId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        setShowHistory(true);
      }
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async () => {
    if (!refillAmount || parseFloat(refillAmount) <= 0) {
      toast.error('Please enter a valid refill amount');
      return;
    }

    if (!selectedDevice?.drum) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/odorant/drums/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          drum_id: selectedDevice.drum.id,
          refilled_amount: parseFloat(refillAmount),
          notes: refillNotes || null
        })
      });

      if (response.ok) {
        toast.success('Drum refilled successfully!');
        setShowRefillForm(false);
        setRefillAmount('');
        setRefillNotes('');
        setSelectedDevice(null);
        fetchSectionsWithDevices();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to refill drum');
      }
    } catch (error) {
      toast.error('Error refilling drum');
    }
  };

  const handleAddDrum = async (device, sectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/odorant/drums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          device_id: device.id,
          section_id: sectionId,
          station_name: device.client_id || `Station ${device.id}`,
          initial_level: 5000,
          odorant_consumption_rate: 0.5
        })
      });

      if (response.ok) {
        toast.success('Odorant drum added successfully!');
        fetchSectionsWithDevices();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to add drum');
      }
    } catch (error) {
      toast.error('Error adding drum');
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleDeviceClick = (device) => {
    if (!device.drum) {
      toast.error('No odorant drum configured for this device. Click "Add Drum" to configure.');
      return;
    }
    setSelectedDevice(device);
  };

  const getStatusColor = (percentage) => {
    if (!percentage) return 'bg-gray-300';
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusTextColor = (percentage) => {
    if (!percentage) return 'text-gray-500';
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 h-full w-full max-w-4xl bg-gradient-to-br from-gray-50 to-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white p-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Odorant Drum Management</h2>
              <p className="text-blue-100 text-sm">Real-time MMCF tracking & Odorant levels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSectionsWithDevices}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sections.map(section => {
            const isExpanded = expandedSections.includes(section.id);

            return (
              <div key={section.id} className="glass rounded-xl overflow-hidden shadow-md">
                {/* Section Header - Card Style */}
                <div
                  onClick={() => toggleSection(section.id)}
                  className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 transition-all p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                      )}

                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800">{section.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Activity className="w-4 h-4" />
                            <span>{section.totalDevices} Total</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600">
                            <Activity className="w-4 h-4" />
                            <span>{section.activeDevices} Active</span>
                          </div>
                          <div className="flex items-center gap-1 text-blue-600">
                            <Droplet className="w-4 h-4" />
                            <span>{section.drumsConfigured} Drums</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Stats */}
                    <div className="flex gap-3">
                      <div className="bg-blue-100 rounded-lg px-4 py-2 text-center">
                        <div className="text-2xl font-bold text-blue-900">{section.cumulative_volume_flow?.toFixed(1) || '0'}</div>
                        <div className="text-xs text-blue-700">MCF/day</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Devices List - Expandable */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/30"
                    >
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {section.devices.map(device => (
                          <motion.div
                            key={device.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleDeviceClick(device)}
                            className={`bg-white rounded-lg p-4 border-2 shadow-sm ${
                              device.drum
                                ? 'border-blue-200 cursor-pointer hover:border-blue-400 hover:shadow-md'
                                : 'border-gray-200 opacity-70'
                            } transition-all`}
                          >
                            {/* Device Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{device.client_id}</h4>
                                <p className="text-xs text-gray-500 truncate">{device.location || 'No location'}</p>
                              </div>
                              {device.is_active ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>

                            {/* Flow Data */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-blue-50 rounded p-2">
                                <div className="text-xs text-gray-600 mb-0.5">MCF</div>
                                <div className="text-sm font-bold text-blue-900">
                                  {device.cumulative_volume_flow?.toFixed(2) || '0.00'}
                                </div>
                              </div>
                              <div className="bg-purple-50 rounded p-2">
                                <div className="text-xs text-gray-600 mb-0.5">MMCF</div>
                                <div className="text-sm font-bold text-purple-900">
                                  {device.mmcf?.toFixed(3) || '0.000'}
                                </div>
                              </div>
                            </div>

                            {/* Drum Info */}
                            {device.drum ? (
                              <div className="border-t-2 border-gray-100 pt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Odorant Level</span>
                                  <span className={`font-bold ${getStatusTextColor(device.drum.percentage_remaining)}`}>
                                    {device.drum.percentage_remaining}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${getStatusColor(device.drum.percentage_remaining)}`}
                                    style={{ width: `${device.drum.percentage_remaining}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{device.drum.current_level?.toFixed(1) || '0'}L</span>
                                  <span>Cap: {device.drum.initial_level?.toFixed(0) || '0'}L</span>
                                </div>
                              </div>
                            ) : (
                              <div className="border-t-2 border-gray-100 pt-3 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddDrum(device, section.id);
                                  }}
                                  className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Drum
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Device Detail Modal */}
        <AnimatePresence>
          {selectedDevice && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-6 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 w-full max-w-3xl my-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedDevice.client_id}</h3>
                    <p className="text-gray-600 mt-1">{selectedDevice.drum?.station_name}</p>
                    <p className="text-sm text-gray-500">{selectedDevice.location}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Animated Drum */}
                  <div className="flex justify-center items-center">
                    <div className="relative w-64 h-80 bg-gradient-to-b from-gray-300 to-gray-400 rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-500">
                      <motion.div
                        className="absolute bottom-0 w-full"
                        style={{
                          backgroundColor: selectedDevice.drum.percentage_remaining > 50 ? '#10b981' :
                                         selectedDevice.drum.percentage_remaining > 20 ? '#f59e0b' : '#ef4444'
                        }}
                        animate={{ height: `${selectedDevice.drum.percentage_remaining}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      >
                        <div className="absolute top-0 w-full h-4 bg-white/20 animate-pulse" />
                      </motion.div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center bg-white/95 px-8 py-6 rounded-2xl backdrop-blur-sm shadow-lg">
                          <p className={`text-6xl font-bold ${getStatusTextColor(selectedDevice.drum.percentage_remaining)}`}>
                            {selectedDevice.drum.percentage_remaining}%
                          </p>
                          <p className="text-sm text-gray-600 mt-2 font-semibold">Remaining</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRefillForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                        Refill
                      </button>
                      <button
                        onClick={() => fetchHistory(selectedDevice.drum.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                      >
                        <History className="w-5 h-5" />
                        History
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">Current Level</p>
                        <p className="text-3xl font-bold text-blue-900">{selectedDevice.drum.current_level?.toFixed(1)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">Capacity</p>
                        <p className="text-3xl font-bold text-gray-900">{selectedDevice.drum.initial_level?.toFixed(0)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">Used</p>
                        <p className="text-3xl font-bold text-red-900">{selectedDevice.drum.odorant_used?.toFixed(1)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-1">MMCF</p>
                        <p className="text-3xl font-bold text-green-900">{selectedDevice.drum.total_mmcf_consumed?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Consumption Rate</span>
                        <span className="font-bold text-gray-900">{selectedDevice.drum.odorant_consumption_rate} L/MMCF</span>
                      </div>
                    </div>

                    {selectedDevice.drum.percentage_remaining < 20 && (
                      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-red-900">Critical Level!</p>
                            <p className="text-sm text-red-700">Immediate refilling required</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Refill Form Modal */}
        <AnimatePresence>
          {showRefillForm && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-6 z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-2xl font-bold mb-4">Refill Odorant Drum</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Refill Amount (Liters) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={refillAmount}
                      onChange={(e) => setRefillAmount(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter amount"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={refillNotes}
                      onChange={(e) => setRefillNotes(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Add notes about this refill"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRefillForm(false);
                      setRefillAmount('');
                      setRefillNotes('');
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefill}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
                  >
                    Confirm Refill
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Modal */}
        <AnimatePresence>
          {showHistory && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-6 overflow-y-auto z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-6 w-full max-w-3xl my-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Refill History</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {loading ? (
                    <div className="text-center py-12 text-gray-500">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      Loading history...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg">No refill history available</p>
                    </div>
                  ) : (
                    history.map(entry => (
                      <div key={entry.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3 text-sm flex-wrap gap-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="font-semibold">{new Date(entry.refill_date).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{entry.refilled_by_username || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm bg-white p-3 rounded-lg shadow-sm">
                          <span className="font-bold text-gray-700">{entry.previous_level?.toFixed(1) || '0'}L</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-bold text-green-600 text-lg">+{entry.refilled_amount.toFixed(1)}L</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-bold text-blue-700">{entry.new_level.toFixed(1)}L</span>
                        </div>
                        {entry.notes && (
                          <div className="mt-3 text-sm text-gray-700 bg-blue-50 p-3 rounded italic border-l-4 border-blue-400">
                            "{entry.notes}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OdorantDrumSidebar;
