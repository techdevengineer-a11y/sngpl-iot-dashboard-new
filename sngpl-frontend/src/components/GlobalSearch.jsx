import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDevices, getAlarms } from '../services/api';
import api from '../services/api';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    devices: [],
    alarms: [],
    readings: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults({ devices: [], alarms: [], readings: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const debounce = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults({ devices: [], alarms: [], readings: [] });
    }
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const [devices, alarms] = await Promise.all([
        getDevices(),
        getAlarms({ limit: 50 })
      ]);

      const query = searchQuery.toLowerCase();

      // Search devices
      const matchingDevices = devices.filter(device =>
        device.device_name.toLowerCase().includes(query) ||
        device.client_id.toLowerCase().includes(query) ||
        device.location.toLowerCase().includes(query)
      ).slice(0, 5);

      // Search alarms
      const matchingAlarms = alarms.filter(alarm =>
        alarm.client_id.toLowerCase().includes(query) ||
        alarm.parameter.toLowerCase().includes(query) ||
        alarm.severity.toLowerCase().includes(query)
      ).slice(0, 5);

      setSearchResults({
        devices: matchingDevices,
        alarms: matchingAlarms,
        readings: []
      });
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllResults = () => {
    return [
      ...searchResults.devices.map(d => ({ type: 'device', data: d })),
      ...searchResults.alarms.map(a => ({ type: 'alarm', data: a }))
    ];
  };

  const handleKeyDown = (e) => {
    const allResults = getAllResults();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === 'Enter' && allResults.length > 0) {
      e.preventDefault();
      handleResultClick(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleResultClick = (result) => {
    if (result.type === 'device') {
      navigate('/devices');
    } else if (result.type === 'alarm') {
      navigate('/alarms');
    }
    onClose();
  };

  const getResultIcon = (type) => {
    const icons = {
      device: '📡',
      alarm: '🔔',
      reading: '📊'
    };
    return icons[type] || '🔍';
  };

  const totalResults = searchResults.devices.length + searchResults.alarms.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="bg-gray-900 border-2 border-blue-500 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-4 flex items-center space-x-3 border-b border-gray-700">
            <span className="text-2xl">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search devices, alarms, readings..."
              className="flex-1 bg-transparent text-white text-lg outline-none"
              autoFocus
            />
            {loading && (
              <div className="text-gray-400 text-sm animate-pulse">Searching...</div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Search Results */}
          {searchQuery.trim().length > 0 && (
            <div className="max-h-[500px] overflow-y-auto">
              {totalResults === 0 && !loading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg">No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try searching for device names, IDs, or alarm types</p>
                </div>
              ) : (
                <div>
                  {/* Devices Section */}
                  {searchResults.devices.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-800/50 text-gray-400 text-xs font-semibold uppercase">
                        Devices ({searchResults.devices.length})
                      </div>
                      {searchResults.devices.map((device, index) => {
                        const globalIndex = index;
                        const isSelected = globalIndex === selectedIndex;
                        return (
                          <div
                            key={`device-${device.id}`}
                            onClick={() => handleResultClick({ type: 'device', data: device })}
                            className={`p-4 flex items-center space-x-4 cursor-pointer transition-all duration-200 border-l-4 ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500'
                                : 'bg-transparent border-transparent hover:bg-gray-800/50'
                            }`}
                          >
                            <span className="text-3xl">{getResultIcon('device')}</span>
                            <div className="flex-1">
                              <p className="text-white font-medium">{device.device_name}</p>
                              <p className="text-gray-400 text-sm">{device.client_id} • {device.location}</p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${
                              device.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`}></div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Alarms Section */}
                  {searchResults.alarms.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-gray-800/50 text-gray-400 text-xs font-semibold uppercase">
                        Alarms ({searchResults.alarms.length})
                      </div>
                      {searchResults.alarms.map((alarm, index) => {
                        const globalIndex = searchResults.devices.length + index;
                        const isSelected = globalIndex === selectedIndex;
                        return (
                          <div
                            key={`alarm-${alarm.id}`}
                            onClick={() => handleResultClick({ type: 'alarm', data: alarm })}
                            className={`p-4 flex items-center space-x-4 cursor-pointer transition-all duration-200 border-l-4 ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500'
                                : 'bg-transparent border-transparent hover:bg-gray-800/50'
                            }`}
                          >
                            <span className="text-3xl">
                              {alarm.severity === 'critical' ? '🚨' : alarm.severity === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                            <div className="flex-1">
                              <p className="text-white font-medium capitalize">
                                {alarm.severity} - {alarm.parameter}
                              </p>
                              <p className="text-gray-400 text-sm">
                                Device {alarm.client_id} • {new Date(alarm.triggered_at).toLocaleString()}
                              </p>
                            </div>
                            {!alarm.is_acknowledged && (
                              <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded">
                                Unread
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer with keyboard shortcuts */}
          {searchQuery.trim().length === 0 && (
            <div className="p-6 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400 mb-4">Search across your entire IoT platform</p>
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">Enter</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
            </div>
          )}

          {totalResults > 0 && (
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <div>
                Found {totalResults} result{totalResults !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">Enter</kbd>
                  <span>Select</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
