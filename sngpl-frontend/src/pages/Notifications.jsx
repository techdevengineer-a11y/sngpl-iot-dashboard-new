import { useState, useEffect } from 'react';
import { getAlarms, getDevices } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const fetchNotifications = async () => {
    try {
      const [alarmsData, devicesData] = await Promise.all([
        getAlarms({ limit: 100 }),
        getDevices()
      ]);

      // Create notifications from alarms
      const alarmNotifications = alarmsData.map(alarm => ({
        id: `alarm-${alarm.id}`,
        type: 'alarm',
        severity: alarm.severity,
        title: `${alarm.severity.toUpperCase()} Alarm: ${alarm.parameter}`,
        message: `Device ${alarm.client_id} ${alarm.parameter} is ${alarm.value}`,
        timestamp: alarm.triggered_at,
        isRead: alarm.is_acknowledged,
        data: alarm
      }));

      // Create notifications for device status changes
      const deviceNotifications = [];
      devicesData.forEach(device => {
        const status = getDeviceStatus(device);
        if (status === 'offline' || status === 'warning') {
          deviceNotifications.push({
            id: `device-${device.id}`,
            type: 'device_status',
            severity: status === 'offline' ? 'critical' : 'warning',
            title: `Device ${status === 'offline' ? 'Offline' : 'Connection Warning'}`,
            message: `${device.device_name} (${device.client_id}) is ${status}`,
            timestamp: device.last_seen || new Date().toISOString(),
            isRead: false,
            data: device
          });
        }
      });

      // Combine and sort notifications
      const allNotifications = [...alarmNotifications, ...deviceNotifications]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(allNotifications);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.last_seen) return 'offline';
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / 1000 / 60;

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredNotifications(notifications);
    } else if (filter === 'unread') {
      setFilteredNotifications(notifications.filter(n => !n.isRead));
    } else if (filter === 'alarm') {
      setFilteredNotifications(notifications.filter(n => n.type === 'alarm'));
    } else if (filter === 'device_status') {
      setFilteredNotifications(notifications.filter(n => n.type === 'device_status'));
    } else if (filter === 'critical') {
      setFilteredNotifications(notifications.filter(n => n.severity === 'critical'));
    }
  };

  const markAsRead = async (notification) => {
    if (notification.type === 'alarm' && !notification.isRead) {
      try {
        await api.put(`/alarms/${notification.data.id}/acknowledge`);
        toast.success('Alarm acknowledged');
        fetchNotifications();
      } catch (error) {
        toast.error('Failed to acknowledge alarm');
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlarms = notifications.filter(n => n.type === 'alarm' && !n.isRead);
      await Promise.all(
        unreadAlarms.map(n => api.put(`/alarms/${n.data.id}/acknowledge`))
      );
      toast.success('All alarms acknowledged');
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to acknowledge all alarms');
    }
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications? This will acknowledge all alarms.')) {
      markAllAsRead();
    }
  };

  const openNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    if (!notification.isRead) {
      markAsRead(notification);
    }
  };

  const getNotificationIcon = (type, severity) => {
    if (type === 'alarm') {
      return severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    }
    return '📡';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-600/20 border-red-600/50 text-red-400',
      warning: 'bg-yellow-600/20 border-yellow-600/50 text-yellow-400',
      info: 'bg-blue-600/20 border-blue-600/50 text-blue-400',
      online: 'bg-green-600/20 border-green-600/50 text-green-400'
    };
    return colors[severity] || colors.info;
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    critical: notifications.filter(n => n.severity === 'critical').length,
    alarms: notifications.filter(n => n.type === 'alarm').length
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications Center</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time system alerts and notifications</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>✓</span>
              <span>Mark All Read</span>
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>🗑️</span>
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Notifications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="text-4xl">📬</div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Unread</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{stats.unread}</p>
              </div>
              <div className="text-4xl">📨</div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.critical}</p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Alarms</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{stats.alarms}</p>
              </div>
              <div className="text-4xl">🔔</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Unread ({stats.unread})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                filter === 'critical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Critical ({stats.critical})
            </button>
            <button
              onClick={() => setFilter('alarm')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                filter === 'alarm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Alarms ({stats.alarms})
            </button>
            <button
              onClick={() => setFilter('device_status')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                filter === 'device_status'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Device Status ({notifications.filter(n => n.type === 'device_status').length})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-gray-600 dark:text-gray-400">Loading notifications...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">You're all caught up! No notifications to show.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => openNotificationDetail(notification)}
                className={`glass rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.01] border-2 ${
                  getSeverityColor(notification.severity)
                } ${!notification.isRead ? 'border-l-4' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-4xl">{getNotificationIcon(notification.type, notification.severity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{notification.title}</h3>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                      </div>
                      <p className="text-gray-300 mb-2">{notification.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{getTimeAgo(notification.timestamp)}</span>
                        <span>•</span>
                        <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="capitalize">{notification.severity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(notification.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notification Detail Modal */}
      {showModal && selectedNotification && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-5xl">{getNotificationIcon(selectedNotification.type, selectedNotification.severity)}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedNotification.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    {new Date(selectedNotification.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${getSeverityColor(selectedNotification.severity)}`}>
                <p className="text-gray-900 dark:text-white text-lg">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Type</p>
                  <p className="text-gray-900 dark:text-white font-semibold capitalize">{selectedNotification.type.replace('_', ' ')}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Severity</p>
                  <p className="text-gray-900 dark:text-white font-semibold capitalize">{selectedNotification.severity}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Time</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{getTimeAgo(selectedNotification.timestamp)}</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Status</p>
                  <p className="text-gray-900 dark:text-white font-semibold">{selectedNotification.isRead ? 'Read' : 'Unread'}</p>
                </div>
              </div>

              {selectedNotification.type === 'alarm' && (
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Alarm Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Device</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.client_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Parameter</p>
                      <p className="text-gray-900 dark:text-white capitalize">{selectedNotification.data.parameter}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Value</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.value}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Threshold</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.threshold}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedNotification.type === 'device_status' && (
                <div className="p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Device Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Device Name</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.device_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Client ID</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.client_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Location</p>
                      <p className="text-gray-900 dark:text-white">{selectedNotification.data.location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Last Seen</p>
                      <p className="text-gray-900 dark:text-white">
                        {selectedNotification.data.last_seen
                          ? new Date(selectedNotification.data.last_seen).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
              >
                Close
              </button>
              {selectedNotification.type === 'alarm' && !selectedNotification.isRead && (
                <button
                  onClick={() => {
                    markAsRead(selectedNotification);
                    setShowModal(false);
                  }}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                >
                  Acknowledge Alarm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Notifications;
