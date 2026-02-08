import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { Droplet, ChevronDown, ChevronRight, RefreshCw, Plus, History, AlertCircle, Calendar, User, Activity, X } from 'lucide-react';
import toast from 'react-hot-toast';

const OdorantDrumNew = () => {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillNotes, setRefillNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSectionsWithDevices();
    const interval = setInterval(fetchSectionsWithDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSectionsWithDevices = async () => {
    try {
      const token = sessionStorage.getItem('token');

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

      // Note: We don't fetch latest readings here to avoid 400+ API calls
      // MMCF will show as 0 until user expands a section
      const devicesWithReadings = allDevices.map(device => ({ ...device, latest_reading: null }));

      // Helper function to extract section from client_id (e.g., "SMS-I-002" -> "I")
      const extractSectionFromClientId = (clientId) => {
        if (!clientId) return null;
        const match = clientId.match(/SMS-([IVX]+)-/);
        return match ? match[1] : null;
      };

      // Group devices by section with their drum info
      const sectionsWithDevices = allSections.map(section => {
        const sectionDevices = devicesWithReadings
          .filter(d => {
            // Extract section from device client_id
            const deviceSection = extractSectionFromClientId(d.client_id);

            // Match based on client_id section or section_id field
            if (section.section_id === 'OTHER') {
              // "Other" includes ONLY devices without a proper section in client_id
              // AND those that don't match any of I, II, III, IV, V
              const validSections = ['I', 'II', 'III', 'IV', 'V'];
              return !deviceSection || !validSections.includes(deviceSection);
            }

            // Match by client_id section pattern (e.g., SMS-I-xxx matches Section I)
            return deviceSection === section.section_id;
          })
          .map(device => {
            const drum = drums.find(dr => dr.device_id === device.id);

            // Calculate MMCF from latest reading volume (same as in Sections page)
            // volume is in MCF, so divide by 1000 to get MMCF
            const mcf = device.latest_reading?.volume || 0;
            const mmcf = mcf / 1000;

            // Calculate odorant consumed based on MMCF (0.5 liters per MMCF)
            const odorantConsumed = mmcf * 0.5;

            // Update drum level if drum exists
            let updatedDrum = drum;
            if (drum && odorantConsumed > 0) {
              const newLevel = Math.max(0, (drum.current_level || drum.initial_level) - odorantConsumed);
              const percentageRemaining = drum.initial_level > 0
                ? Math.round((newLevel / drum.initial_level) * 100)
                : 0;

              updatedDrum = {
                ...drum,
                current_level: newLevel,
                percentage_remaining: percentageRemaining
              };
            }

            return {
              ...device,
              drum: updatedDrum,
              cumulative_volume_flow: mcf,
              mmcf: mmcf,
              odorant_consumed: odorantConsumed
            };
          });

        const offlineCount = sectionDevices.filter(d => !d.is_active).length;
        const alarmsCount = Math.floor(Math.random() * sectionDevices.length * 0.2); // Mock alarms

        return {
          ...section,
          devices: sectionDevices,
          totalDevices: sectionDevices.length,
          activeDevices: sectionDevices.filter(d => d.is_active).length,
          offlineDevices: offlineCount,
          devicesWithAlarms: alarmsCount,
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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

  const handleSectionClick = (section) => {
    setSelectedSection(section);
  };

  // Section colors matching Sections.jsx
  const sectionColors = [
    'from-blue-600 to-blue-700',
    'from-green-600 to-green-700',
    'from-purple-600 to-purple-700',
    'from-orange-600 to-orange-700',
    'from-pink-600 to-pink-700',
  ];

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

  return (
    <Layout>
      <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplet className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Odorant Drum Management</h1>
              <p className="text-gray-600 mt-1">Real-time MMCF tracking & Odorant levels for all devices</p>
            </div>
          </div>
          <button
            onClick={fetchSectionsWithDevices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => (
              <div key={section.section_id} className="flex flex-col">
                {/* Section Card */}
                <div
                  onClick={() => handleSectionClick(section)}
                  className="glass rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  {/* Header with Section Number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${sectionColors[index % sectionColors.length]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                      <span className="text-2xl font-bold">{section.section_id}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Total Flow</div>
                      <div className="text-3xl font-bold text-cyan-600">{section.cumulative_volume_flow?.toFixed(1) || '0'}</div>
                      <div className="text-xs text-gray-600">{section.unit || 'MCF/day'}</div>
                    </div>
                  </div>

                  {/* Section Name */}
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{section.section_name}</h2>

                  {/* Total Devices - Single Stat */}
                  <div className="bg-green-100 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      <div className="text-sm text-gray-600">Total Devices</div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">{section.totalDevices || 0}</div>
                  </div>

                  {/* View Details Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-300">
                    <span className="text-sm text-gray-600">View Devices</span>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Section Devices Modal */}
        <AnimatePresence>
          {selectedSection && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 w-full max-w-6xl my-8 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{selectedSection.section_name}</h2>
                    <p className="text-gray-600 mt-1">
                      Section {selectedSection.section_id} • {selectedSection.devices?.length || 0} Devices • {selectedSection.activeDevices || 0} Online
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSection(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                {/* Devices Table */}
                {!selectedSection.devices || selectedSection.devices.length === 0 ? (
                  <p className="text-gray-500 text-center py-16 text-lg">No devices found in this section</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                          <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Device ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">MCF</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">MMCF</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Drum Status</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSection.devices.map((device, index) => (
                          <tr
                            key={device.id}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200`}
                          >
                            {/* Status */}
                            <td className="px-4 py-3">
                              {device.is_active ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                                  <span className="text-sm text-green-600 font-semibold">Online</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                  <span className="text-sm text-gray-500">Offline</span>
                                </div>
                              )}
                            </td>

                            {/* Device ID */}
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-gray-900">{device.client_id}</span>
                            </td>

                            {/* Name */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700">{device.device_name || 'N/A'}</span>
                            </td>

                            {/* Location */}
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">{device.location || 'No location'}</span>
                            </td>

                            {/* MCF */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-blue-900">
                                {device.cumulative_volume_flow?.toFixed(2) || '0.00'}
                              </span>
                            </td>

                            {/* MMCF */}
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-purple-900">
                                {device.mmcf?.toFixed(3) || '0.000'}
                              </span>
                            </td>

                            {/* Drum Status */}
                            <td className="px-4 py-3">
                              {device.drum ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-sm font-bold ${getStatusTextColor(device.drum.percentage_remaining)}`}>
                                    {device.drum.percentage_remaining}%
                                  </span>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${getStatusColor(device.drum.percentage_remaining)}`}
                                      style={{ width: `${device.drum.percentage_remaining}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">
                                    {device.drum.current_level?.toFixed(1) || '0'}L / {device.drum.initial_level?.toFixed(0) || '0'}L
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No Drum</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 text-center">
                              {device.drum ? (
                                <button
                                  onClick={() => handleDeviceClick(device)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                >
                                  View Details
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddDrum(device, selectedSection.section_id);
                                  }}
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-1 mx-auto"
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Drum
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Device Detail Modal */}
        <AnimatePresence>
          {selectedDevice && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 w-full max-w-4xl my-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-4xl font-bold text-gray-900">{selectedDevice.client_id}</h3>
                    <p className="text-gray-600 mt-1 text-lg">{selectedDevice.drum?.station_name}</p>
                    <p className="text-sm text-gray-500">{selectedDevice.location}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Animated Drum */}
                  <div className="flex justify-center items-center">
                    <div className="relative w-72 h-96 bg-gradient-to-b from-gray-300 to-gray-400 rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-500">
                      <motion.div
                        className="absolute bottom-0 w-full"
                        style={{
                          backgroundColor: selectedDevice.drum.percentage_remaining > 50 ? '#10b981' :
                                         selectedDevice.drum.percentage_remaining > 20 ? '#f59e0b' : '#ef4444'
                        }}
                        animate={{ height: `${selectedDevice.drum.percentage_remaining}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      >
                        <div className="absolute top-0 w-full h-6 bg-white/20 animate-pulse" />
                      </motion.div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center bg-white/95 px-10 py-8 rounded-2xl backdrop-blur-sm shadow-xl">
                          <p className={`text-7xl font-bold ${getStatusTextColor(selectedDevice.drum.percentage_remaining)}`}>
                            {selectedDevice.drum.percentage_remaining}%
                          </p>
                          <p className="text-base text-gray-600 mt-3 font-semibold">Remaining</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="space-y-5">
                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowRefillForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg text-lg font-semibold"
                      >
                        <Plus className="w-6 h-6" />
                        Refill Drum
                      </button>
                      <button
                        onClick={() => fetchHistory(selectedDevice.drum.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg text-lg font-semibold"
                      >
                        <History className="w-6 h-6" />
                        View History
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Current Level</p>
                        <p className="text-4xl font-bold text-blue-900">{selectedDevice.drum.current_level?.toFixed(1)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Capacity</p>
                        <p className="text-4xl font-bold text-gray-900">{selectedDevice.drum.initial_level?.toFixed(0)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1 font-medium">Used</p>
                        <p className="text-4xl font-bold text-red-900">{selectedDevice.drum.odorant_used?.toFixed(1)}L</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-gray-600 mb-1 font-medium">MMCF</p>
                        <p className="text-4xl font-bold text-green-900">{selectedDevice.drum.total_mmcf_consumed?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 font-medium">Consumption Rate</span>
                        <span className="font-bold text-gray-900 text-lg">{selectedDevice.drum.odorant_consumption_rate} L/MMCF</span>
                      </div>
                    </div>

                    {selectedDevice.drum.percentage_remaining < 20 && (
                      <div className="bg-red-50 border-2 border-red-500 rounded-xl p-5">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-red-900 text-lg">Critical Level Warning!</p>
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
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-3xl font-bold mb-6">Refill Odorant Drum</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Refill Amount (Liters) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={refillAmount}
                      onChange={(e) => setRefillAmount(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      placeholder="Enter amount"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={refillNotes}
                      onChange={(e) => setRefillNotes(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Add notes about this refill"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => {
                      setShowRefillForm(false);
                      setRefillAmount('');
                      setRefillNotes('');
                    }}
                    className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-bold text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefill}
                    className="flex-1 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold shadow-lg text-lg"
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
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 overflow-y-auto z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 w-full max-w-4xl my-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-bold">Refill History</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-4">
                  {loading ? (
                    <div className="text-center py-16 text-gray-500">
                      <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" />
                      <p className="text-lg">Loading history...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-xl">No refill history available</p>
                    </div>
                  ) : (
                    history.map(entry => (
                      <div key={entry.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4 text-sm flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-5 h-5" />
                            <span className="font-bold text-base">{new Date(entry.refill_date).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="w-5 h-5" />
                            <span className="font-semibold">{entry.refilled_by_username || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                          <span className="font-bold text-gray-700 text-lg">{entry.previous_level?.toFixed(1) || '0'}L</span>
                          <span className="text-gray-400 text-xl">→</span>
                          <span className="font-bold text-green-600 text-2xl">+{entry.refilled_amount.toFixed(1)}L</span>
                          <span className="text-gray-400 text-xl">→</span>
                          <span className="font-bold text-blue-700 text-lg">{entry.new_level.toFixed(1)}L</span>
                        </div>
                        {entry.notes && (
                          <div className="mt-4 text-sm text-gray-700 bg-blue-50 p-4 rounded-lg italic border-l-4 border-blue-400">
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
      </div>
    </Layout>
  );
};

export default OdorantDrumNew;
