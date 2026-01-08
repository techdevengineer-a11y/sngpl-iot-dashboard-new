import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { Droplet, History, Plus, RefreshCw, TrendingDown, AlertCircle, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';

const OdorantDrum = () => {
  const [drums, setDrums] = useState([]);
  const [selectedDrum, setSelectedDrum] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [refillAmount, setRefillAmount] = useState('');
  const [refillNotes, setRefillNotes] = useState('');
  const [showAddDrumForm, setShowAddDrumForm] = useState(false);
  const [sections, setSections] = useState([]);
  const [devices, setDevices] = useState([]);
  const [newDrum, setNewDrum] = useState({
    device_id: '',
    section_id: '',
    station_name: '',
    initial_level: '5000',
    odorant_consumption_rate: '0.5'
  });

  useEffect(() => {
    fetchDrums();
    fetchSections();
    fetchDevices();
    // Refresh every 10 seconds for real-time MMCF updates
    const interval = setInterval(fetchDrums, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDrums = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/odorant/drums', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDrums(data);
      }
    } catch (error) {
      console.error('Error fetching odorant drums:', error);
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

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sections/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Sections data received:', data.sections);
        setSections(data.sections || []);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/devices/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const activeDevices = data.filter(d => d.is_active) || [];
        console.log('Devices data received:', activeDevices);
        setDevices(activeDevices);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleAddDrum = async () => {
    // Validate all required fields
    if (!newDrum.device_id || !newDrum.section_id || !newDrum.station_name || !newDrum.initial_level) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate numeric fields
    const deviceId = parseInt(newDrum.device_id);
    const sectionId = parseInt(newDrum.section_id);
    const initialLevel = parseFloat(newDrum.initial_level);
    const consumptionRate = parseFloat(newDrum.odorant_consumption_rate);

    console.log('Parsed values:', { deviceId, sectionId, initialLevel, consumptionRate });
    console.log('Raw values:', newDrum);

    if (isNaN(deviceId)) {
      toast.error('Invalid device ID. Please select a device.');
      return;
    }
    if (isNaN(sectionId)) {
      toast.error('Invalid section ID. Please select a section.');
      return;
    }
    if (isNaN(initialLevel)) {
      toast.error('Invalid initial level. Please enter a valid number.');
      return;
    }
    if (isNaN(consumptionRate)) {
      toast.error('Invalid consumption rate. Please enter a valid number.');
      return;
    }

    if (initialLevel <= 0) {
      toast.error('Initial level must be greater than 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        device_id: deviceId,
        section_id: sectionId,
        station_name: newDrum.station_name.trim(),
        initial_level: initialLevel,
        odorant_consumption_rate: consumptionRate
      };

      console.log('Sending drum creation request:', payload);

      const response = await fetch('/api/odorant/drums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Odorant drum added successfully!');
        setShowAddDrumForm(false);
        setNewDrum({
          device_id: '',
          section_id: '',
          station_name: '',
          initial_level: '5000',
          odorant_consumption_rate: '0.5'
        });
        fetchDrums();
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to add drum' }));
        console.error('API Error Response:', error);

        let errorMessage = 'Failed to add drum';

        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map(e => {
            if (typeof e === 'string') return e;
            if (e.msg) return `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`;
            return JSON.stringify(e);
          }).join('; ');
        } else if (error.detail && typeof error.detail === 'object') {
          errorMessage = JSON.stringify(error.detail);
        }

        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding drum:', error);
      toast.error('Error adding drum: ' + error.message);
    }
  };

  const handleRefill = async () => {
    if (!refillAmount || parseFloat(refillAmount) <= 0) {
      toast.error('Please enter a valid refill amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/odorant/drums/refill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          drum_id: selectedDrum.id,
          refilled_amount: parseFloat(refillAmount),
          notes: refillNotes || null
        })
      });

      if (response.ok) {
        toast.success('Odorant drum refilled successfully!');
        setShowRefillForm(false);
        setRefillAmount('');
        setRefillNotes('');
        setSelectedDrum(null);
        fetchDrums();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to refill drum');
      }
    } catch (error) {
      toast.error('Error refilling drum');
    }
  };

  const getDrumColor = (percentage) => {
    if (percentage > 50) return 'from-green-400 to-green-600';
    if (percentage > 20) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getStatusColor = (percentage) => {
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (percentage) => {
    if (percentage > 50) return { text: 'Good', class: 'bg-green-100 text-green-700' };
    if (percentage > 20) return { text: 'Medium', class: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Low', class: 'bg-red-100 text-red-700' };
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Droplet className="w-10 h-10 text-blue-600" />
              Odorant Drum Management
            </h1>
            <p className="text-gray-600 mt-2">Real-time MMCF-based consumption tracking & refill history</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddDrumForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Drum
            </button>
            <button
              onClick={fetchDrums}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Drums Grid */}
        {drums.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Droplet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No odorant drums configured</p>
            <p className="text-sm text-gray-400 mt-2">Contact admin to add a drum to start tracking</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {drums.map((drum) => (
              <motion.div
                key={drum.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-6">
                  {/* Animated Drum Visualization */}
                  <div className="flex-shrink-0">
                    <div className="relative h-64 w-40 bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-2xl rounded-b-lg border-4 border-gray-500 overflow-hidden">
                      {/* Real-time Fluid Level */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${drum.percentage_remaining}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getDrumColor(drum.percentage_remaining)}`}
                        style={{
                          boxShadow: 'inset 0 -10px 20px rgba(255,255,255,0.3)',
                        }}
                      >
                        {/* Animated Wave Effect - Floating Liquid */}
                        <div className="absolute top-0 left-0 right-0 h-4 bg-white/30 animate-pulse" />
                      </motion.div>

                      {/* Level Indicator Lines */}
                      {[25, 50, 75].map((level) => (
                        <div
                          key={level}
                          className="absolute left-0 right-0 border-t border-dashed border-gray-600/30"
                          style={{ bottom: `${level}%` }}
                        />
                      ))}

                      {/* Percentage Badge */}
                      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg">
                        <div className={`text-xl font-bold ${getStatusColor(drum.percentage_remaining)}`}>
                          {drum.percentage_remaining.toFixed(1)}%
                        </div>
                      </div>

                      {/* Low Level Warning */}
                      {drum.percentage_remaining < 20 && (
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-xs font-semibold">LOW</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drum Details & Real-time Data */}
                  <div className="flex-1 space-y-4">
                    {/* Header with Station Info */}
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900 text-xl">{drum.station_name}</h3>
                          <p className="text-sm text-gray-500">Section: {drum.section_name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(drum.percentage_remaining).class}`}>
                          {getStatusBadge(drum.percentage_remaining).text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>Last refill: {new Date(drum.refill_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Real-time Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-blue-600 mb-1">Current Level</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {drum.current_level.toFixed(1)}L
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          / {drum.initial_level.toFixed(0)}L capacity
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-xs text-purple-600 mb-1">Odorant Used</div>
                        <div className="text-2xl font-bold text-purple-700">
                          {drum.odorant_used.toFixed(1)}L
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                          Since last refill
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-xs text-green-600 mb-1">MMCF Consumed</div>
                        <div className="text-2xl font-bold text-green-700">
                          {drum.total_mmcf_consumed.toFixed(2)}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Total volume
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-xs text-orange-600 mb-1">Consumption Rate</div>
                        <div className="text-2xl font-bold text-orange-700">
                          {drum.odorant_consumption_rate}
                        </div>
                        <div className="text-xs text-orange-600 mt-1">
                          L per MMCF
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setSelectedDrum(drum);
                          setShowRefillForm(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Refill
                      </button>
                      <button
                        onClick={() => fetchHistory(drum.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Refill Form Modal */}
        {showRefillForm && selectedDrum && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4">Refill Odorant Drum</h3>
              <p className="text-gray-600 mb-4">Station: {selectedDrum.station_name}</p>
              <p className="text-sm text-gray-500 mb-4">
                Current Level: {selectedDrum.current_level.toFixed(1)}L / {selectedDrum.initial_level.toFixed(0)}L
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Refill Amount (Liters)
                  </label>
                  <input
                    type="number"
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount in liters"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any notes about the refill..."
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowRefillForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefill}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refill
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Refill History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No refill history available</p>
                ) : (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {new Date(entry.refill_date).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <User className="w-4 h-4" />
                            <span>By: {entry.refilled_by_username || 'System'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{entry.refilled_amount.toFixed(1)}L
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 bg-white p-2 rounded">
                        <span>Before: {entry.previous_level?.toFixed(1) || '0'}L</span>
                        <span className="text-gray-400">→</span>
                        <span>After: {entry.new_level.toFixed(1)}L</span>
                      </div>

                      {entry.notes && (
                        <div className="mt-2 text-sm text-gray-500 italic bg-blue-50 p-2 rounded">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Add New Drum Form Modal */}
        {showAddDrumForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Add New Odorant Drum</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newDrum.section_id}
                    onChange={(e) => {
                      console.log('Section selected:', e.target.value);
                      setNewDrum({...newDrum, section_id: e.target.value});
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => {
                      const sectionId = section.section_id || section.id;
                      const sectionName = section.section_name || section.name;
                      console.log('Rendering section option:', { sectionId, sectionName });
                      return (
                        <option key={sectionId} value={sectionId}>
                          {sectionName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newDrum.device_id}
                    onChange={(e) => {
                      console.log('Device selected:', e.target.value);
                      const device = devices.find(d => d.id === parseInt(e.target.value));
                      console.log('Found device:', device);
                      setNewDrum({
                        ...newDrum,
                        device_id: e.target.value,
                        station_name: device ? device.client_id : ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Device</option>
                    {devices.map(device => (
                      <option key={device.id} value={device.id}>
                        {device.client_id} - {device.location || 'No location'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Station Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDrum.station_name}
                    onChange={(e) => setNewDrum({...newDrum, station_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter station name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Initial Drum Capacity (Liters) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newDrum.initial_level}
                    onChange={(e) => setNewDrum({...newDrum, initial_level: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="5000"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Consumption Rate (Liters per MMCF)
                  </label>
                  <input
                    type="number"
                    value={newDrum.odorant_consumption_rate}
                    onChange={(e) => setNewDrum({...newDrum, odorant_consumption_rate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.5"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 0.5 liters consumed per MMCF of gas</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddDrumForm(false);
                    setNewDrum({
                      device_id: '',
                      section_id: '',
                      station_name: '',
                      initial_level: '5000',
                      odorant_consumption_rate: '0.5'
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDrum}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Drum
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OdorantDrum;
