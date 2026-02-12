import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Lock, Database, Eye, Globe, Palette, Save, Download, Plus, Trash2, Users, X, Mail, FileText, Monitor, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentUser, updateUser, changePassword, getAllRoles, listUsers, getUserPermissions, createUser, deleteUser, getAuditLogs } from '../services/api';

const Settings = () => {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    department: '',
    role: ''
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    alarmNotifications: true,
    weeklyReports: true,
    monthlyReports: false,
    deviceOfflineAlerts: true,
    thresholdAlerts: true
  });

  // Display Settings
  const [displaySettings, setDisplaySettings] = useState({
    theme: 'dark',
    language: 'en',
    timezone: 'Asia/Karachi',
    dateFormat: 'DD/MM/YYYY',
    temperatureUnit: 'fahrenheit',
    refreshInterval: '10'
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    loginNotifications: true
  });

  const PAGE_SIZE = 20;

  const baseTabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display & Preferences', icon: Palette },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'system', label: 'System', icon: Database }
  ];

  const adminOnlyTabs = [
    { id: 'user-logs', label: 'User Logs', icon: FileText },
    { id: 'device-logs', label: 'Device Logs', icon: Monitor }
  ];

  const tabs = authUser?.role === 'admin' ? [...baseTabs, ...adminOnlyTabs] : baseTabs;

  // User Logs state
  const [userLogs, setUserLogs] = useState([]);
  const [userLogsTotal, setUserLogsTotal] = useState(0);
  const [userLogsPage, setUserLogsPage] = useState(1);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [userLogsFilters, setUserLogsFilters] = useState({ search: '', action: '', start_date: '', end_date: '' });

  // Device Logs state
  const [deviceLogs, setDeviceLogs] = useState([]);
  const [deviceLogsTotal, setDeviceLogsTotal] = useState(0);
  const [deviceLogsPage, setDeviceLogsPage] = useState(1);
  const [deviceLogsLoading, setDeviceLogsLoading] = useState(false);
  const [deviceLogsFilters, setDeviceLogsFilters] = useState({ search: '', action: '', start_date: '', end_date: '' });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Roles & Permissions state
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userPermissions, setUserPermissions] = useState(null);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState([]);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  // Load user data from backend
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        setUserData(user);

        // Populate account settings from backend
        setAccountSettings({
          username: user.username || '',
          email: user.email || '',
          fullName: localStorage.getItem('user_fullname') || '',
          phone: localStorage.getItem('user_phone') || '',
          department: localStorage.getItem('user_department') || 'Operations',
          role: user.role || ''
        });

        // Load other settings from localStorage
        const savedNotifications = localStorage.getItem('settings_notifications');
        const savedDisplay = localStorage.getItem('settings_display');
        const savedSecurity = localStorage.getItem('settings_security');

        if (savedNotifications) setNotificationSettings(JSON.parse(savedNotifications));
        if (savedDisplay) setDisplaySettings(JSON.parse(savedDisplay));
        if (savedSecurity) setSecuritySettings(JSON.parse(savedSecurity));
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast.error('Failed to load user settings');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Load roles and permissions when roles tab is active
  useEffect(() => {
    if (activeTab === 'roles') {
      loadRolesAndPermissions();
    }
  }, [activeTab]);

  const loadRolesAndPermissions = async () => {
    setLoadingRoles(true);
    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        getAllRoles(),
        listUsers()
      ]);

      setRoles(rolesResponse.data);
      setUsers(usersResponse.data);

      // Load current user's permissions
      if (userData) {
        const permsResponse = await getUserPermissions(userData.id);
        setUserPermissions(permsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view roles');
      } else {
        toast.error('Failed to load roles and permissions');
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  // Load audit logs
  const loadUserLogs = async (page = 1, filters = userLogsFilters) => {
    setUserLogsLoading(true);
    try {
      const params = {
        resource_type: 'user',
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE
      };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await getAuditLogs(params);
      setUserLogs(response.data.logs);
      setUserLogsTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load user logs:', error);
      toast.error('Failed to load user logs');
    } finally {
      setUserLogsLoading(false);
    }
  };

  const loadDeviceLogs = async (page = 1, filters = deviceLogsFilters) => {
    setDeviceLogsLoading(true);
    try {
      const params = {
        resource_type: 'device',
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE
      };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await getAuditLogs(params);
      setDeviceLogs(response.data.logs);
      setDeviceLogsTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load device logs:', error);
      toast.error('Failed to load device logs');
    } finally {
      setDeviceLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'user-logs') {
      loadUserLogs(userLogsPage, userLogsFilters);
    } else if (activeTab === 'device-logs') {
      loadDeviceLogs(deviceLogsPage, deviceLogsFilters);
    }
  }, [activeTab, userLogsPage, deviceLogsPage]);

  const handleCreateUser = async () => {
    // Validation
    if (!newUserData.username || !newUserData.email || !newUserData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newUserData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await createUser({
        username: newUserData.username,
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role
      });

      toast.success(`User "${newUserData.username}" created successfully with role "${newUserData.role}"`);
      setShowCreateUserModal(false);
      setNewUserData({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });

      // Reload users list
      loadRolesAndPermissions();
    } catch (error) {
      console.error('Create user error:', error);

      // Handle validation errors from backend
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;

        // If detail is an array of validation errors
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
          toast.error(`Validation error: ${errorMessages}`);
        }
        // If detail is a string
        else if (typeof detail === 'string') {
          toast.error(detail);
        }
        // If detail is an object
        else {
          toast.error(JSON.stringify(detail));
        }
      } else {
        toast.error('Failed to create user');
      }
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await deleteUser(userId);
      toast.success(`User "${username}" deleted successfully`);
      loadRolesAndPermissions();
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    try {
      const permsResponse = await getUserPermissions(user.id);
      setSelectedUserPermissions(permsResponse.data.permissions || []);
      setShowUserDetailsModal(true);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      toast.error('Failed to load user permissions');
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await updateUser(userId, { role: newRole });
      toast.success('User role updated successfully');
      loadRolesAndPermissions();
      setShowUserDetailsModal(false);
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast.error(error.response?.data?.detail || 'Failed to update user role');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user profile in backend
      if (userData) {
        await updateUser(userData.id, {
          email: accountSettings.email
        });

        // Save extended fields to localStorage (not in backend model)
        localStorage.setItem('user_fullname', accountSettings.fullName);
        localStorage.setItem('user_phone', accountSettings.phone);
        localStorage.setItem('user_department', accountSettings.department);
      }

      // Save other settings to localStorage
      localStorage.setItem('settings_notifications', JSON.stringify(notificationSettings));
      localStorage.setItem('settings_display', JSON.stringify(displaySettings));
      localStorage.setItem('settings_security', JSON.stringify(securitySettings));

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      await changePassword(userData.id, {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });

      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Password change error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'object' && errorMsg.message) {
        toast.error(errorMsg.message);
      } else if (typeof errorMsg === 'string') {
        toast.error(errorMsg);
      } else {
        toast.error('Failed to change password');
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Change Password
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div></div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Notification Preferences
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                    <p className="text-sm text-gray-600">Receive critical alerts via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, smsNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Browser push notifications for real-time alerts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, pushNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Alarm Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified when alarms are triggered</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.alarmNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, alarmNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Device Offline Alerts</h4>
                    <p className="text-sm text-gray-600">Notify when devices go offline</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.deviceOfflineAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, deviceOfflineAlerts: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Weekly Reports</h4>
                    <p className="text-sm text-gray-600">Receive weekly summary reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weeklyReports}
                      onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReports: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Monthly Reports</h4>
                    <p className="text-sm text-gray-600">Receive monthly analytics reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.monthlyReports}
                      onChange={(e) => setNotificationSettings({...notificationSettings, monthlyReports: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-600" />
                Display & Preferences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select
                    value={displaySettings.theme}
                    onChange={(e) => setDisplaySettings({...displaySettings, theme: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={displaySettings.language}
                    onChange={(e) => setDisplaySettings({...displaySettings, language: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="ur">Urdu (اردو)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select
                    value={displaySettings.timezone}
                    onChange={(e) => setDisplaySettings({...displaySettings, timezone: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Karachi">Pakistan (PKT - UTC+5)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (EST)</option>
                    <option value="Europe/London">London (GMT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                  <select
                    value={displaySettings.dateFormat}
                    onChange={(e) => setDisplaySettings({...displaySettings, dateFormat: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Unit</label>
                  <select
                    value={displaySettings.temperatureUnit}
                    onChange={(e) => setDisplaySettings({...displaySettings, temperatureUnit: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fahrenheit">Fahrenheit (°F)</option>
                    <option value="celsius">Celsius (°C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Refresh Interval</label>
                  <select
                    value={displaySettings.refreshInterval}
                    onChange={(e) => setDisplaySettings({...displaySettings, refreshInterval: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="5">5 seconds</option>
                    <option value="10">10 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Security Settings
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorAuth}
                      onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Login Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified of new login attempts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.loginNotifications}
                      onChange={(e) => setSecuritySettings({...securitySettings, loginNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                  <select
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => setSecuritySettings({...securitySettings, passwordExpiry: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Login Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Current Session</p>
                    <p className="text-sm text-gray-600">IP: 192.168.1.100 • Chrome on Windows</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Yesterday, 3:45 PM</p>
                    <p className="text-sm text-gray-600">IP: 192.168.1.100 • Chrome on Windows</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Ended</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="space-y-6">
            {/* Users Management Section */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  User Management
                </h3>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create User
                </button>
              </div>

              {loadingRoles ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Username</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user, index) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.role === 'admin' ? 'bg-red-100 text-red-700' :
                              user.role === 'user' ? 'bg-purple-100 text-purple-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewUserDetails(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Details
                              </button>
                              {user.id !== userData?.id && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Roles & Permissions Section */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Roles & Permissions
                </h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  Connected to Backend
                </span>
              </div>

              {loadingRoles ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading roles...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {roles.map((role) => {
                      const userCount = users.filter(u => u.role === role.name.toLowerCase()).length;
                      const roleColors = {
                        'admin': 'bg-red-500',
                        'operator': 'bg-blue-500',
                        'viewer': 'bg-green-500',
                        'user': 'bg-purple-500'
                      };
                      const colorClass = roleColors[role.name.toLowerCase()] || 'bg-gray-500';

                      return (
                        <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{role.name}</h4>
                                {role.is_system && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                    System Role
                                  </span>
                                )}
                                {!role.is_active && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {role.description || 'No description'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                <Users className="w-3 h-3 inline mr-1" />
                                {userCount} user{userCount !== 1 ? 's' : ''} assigned
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={() => toast.info('View role details - coming soon')}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {userPermissions && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Your Permissions</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {userPermissions.permissions.slice(0, 6).map((perm, idx) => (
                          <span key={idx} className="text-xs bg-white px-2 py-1 rounded text-blue-700 border border-blue-200">
                            {perm}
                          </span>
                        ))}
                        {userPermissions.permissions.length > 6 && (
                          <span className="text-xs bg-white px-2 py-1 rounded text-blue-700 border border-blue-200">
                            +{userPermissions.permissions.length - 6} more
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Current Role: <strong>{userPermissions.roles.join(', ')}</strong>
                      </p>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-900">
                      <strong>Status:</strong> Role-Based Access Control (RBAC) is fully integrated with the backend.
                      Only administrators can create, modify, or delete roles and assign them to users.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                System Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">System Version</p>
                  <p className="text-lg font-semibold text-gray-900">v2.1.0</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Database Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-lg font-semibold text-gray-900">Connected</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">API Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-lg font-semibold text-gray-900">Online</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">MQTT Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-lg font-semibold text-gray-900">Connected</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Last Backup</p>
                  <p className="text-lg font-semibold text-gray-900">2 hours ago</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Storage Used</p>
                  <p className="text-lg font-semibold text-gray-900">3.2 GB / 100 GB</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">System Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Database className="w-4 h-4" />
                  Backup Database
                </button>
                <button className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Audit Trail
                </button>
              </div>
            </div>
          </div>
        );

      case 'user-logs':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                User Logs
              </h3>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={userLogsFilters.search}
                    onChange={(e) => setUserLogsFilters({ ...userLogsFilters, search: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                  <select
                    value={userLogsFilters.action}
                    onChange={(e) => setUserLogsFilters({ ...userLogsFilters, action: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Actions</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="LOGOUT">LOGOUT</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={userLogsFilters.start_date}
                    onChange={(e) => setUserLogsFilters({ ...userLogsFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={userLogsFilters.end_date}
                    onChange={(e) => setUserLogsFilters({ ...userLogsFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => { setUserLogsPage(1); loadUserLogs(1, userLogsFilters); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filter
                  </button>
                  <button
                    onClick={() => { const cleared = { search: '', action: '', start_date: '', end_date: '' }; setUserLogsFilters(cleared); setUserLogsPage(1); loadUserLogs(1, cleared); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Table */}
              {userLogsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading logs...</p>
                </div>
              ) : userLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">User Agent</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.username || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                log.action === 'LOGIN' ? 'bg-green-100 text-green-700' :
                                log.action === 'LOGOUT' ? 'bg-yellow-100 text-yellow-700' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                log.action === 'CREATE' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'UPDATE' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{log.ip_address || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="block max-w-[200px] truncate" title={log.user_agent || ''}>
                                {log.user_agent || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing {((userLogsPage - 1) * PAGE_SIZE) + 1}–{Math.min(userLogsPage * PAGE_SIZE, userLogsTotal)} of {userLogsTotal} logs
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUserLogsPage(p => Math.max(1, p - 1))}
                        disabled={userLogsPage === 1}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-700 px-2">
                        Page {userLogsPage} of {Math.max(1, Math.ceil(userLogsTotal / PAGE_SIZE))}
                      </span>
                      <button
                        onClick={() => setUserLogsPage(p => p + 1)}
                        disabled={userLogsPage >= Math.ceil(userLogsTotal / PAGE_SIZE)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'device-logs':
        return (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Device Logs
              </h3>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={deviceLogsFilters.search}
                    onChange={(e) => setDeviceLogsFilters({ ...deviceLogsFilters, search: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                  <select
                    value={deviceLogsFilters.action}
                    onChange={(e) => setDeviceLogsFilters({ ...deviceLogsFilters, action: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="VIEW">VIEW</option>
                    <option value="EXPORT">EXPORT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={deviceLogsFilters.start_date}
                    onChange={(e) => setDeviceLogsFilters({ ...deviceLogsFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={deviceLogsFilters.end_date}
                    onChange={(e) => setDeviceLogsFilters({ ...deviceLogsFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => { setDeviceLogsPage(1); loadDeviceLogs(1, deviceLogsFilters); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filter
                  </button>
                  <button
                    onClick={() => { const cleared = { search: '', action: '', start_date: '', end_date: '' }; setDeviceLogsFilters(cleared); setDeviceLogsPage(1); loadDeviceLogs(1, cleared); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Table */}
              {deviceLogsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading logs...</p>
                </div>
              ) : deviceLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Device ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {deviceLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.username || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                log.action === 'CREATE' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'UPDATE' ? 'bg-purple-100 text-purple-700' :
                                log.action === 'VIEW' ? 'bg-green-100 text-green-700' :
                                log.action === 'EXPORT' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{log.resource_id || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{log.ip_address || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing {((deviceLogsPage - 1) * PAGE_SIZE) + 1}–{Math.min(deviceLogsPage * PAGE_SIZE, deviceLogsTotal)} of {deviceLogsTotal} logs
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeviceLogsPage(p => Math.max(1, p - 1))}
                        disabled={deviceLogsPage === 1}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-gray-700 px-2">
                        Page {deviceLogsPage} of {Math.max(1, Math.ceil(deviceLogsTotal / PAGE_SIZE))}
                      </span>
                      <button
                        onClick={() => setDeviceLogsPage(p => p + 1)}
                        disabled={deviceLogsPage >= Math.ceil(deviceLogsTotal / PAGE_SIZE)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-blue-600" />
                Settings
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your account settings and preferences
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {renderContent()}
          </div>
        </div>

        {/* User Details Modal */}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <p className="text-gray-900 font-semibold">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedUser.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedUser.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900 text-sm">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Change Role Section */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Change User Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {roles.filter(r => r.is_active).map(role => (
                      <button
                        key={role.id}
                        onClick={() => handleChangeUserRole(selectedUser.id, role.name.toLowerCase())}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedUser.role === role.name.toLowerCase()
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            role.name.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' :
                            role.name.toLowerCase() === 'user' ? 'bg-purple-100 text-purple-700' :
                            role.name.toLowerCase() === 'operator' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {role.name}
                          </span>
                          {selectedUser.role === role.name.toLowerCase() && (
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 text-left">
                          {role.description || 'No description'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions List */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions ({selectedUserPermissions.length})
                  </label>
                  {selectedUserPermissions.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {selectedUserPermissions.map((perm, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm text-blue-900">{perm}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No permissions assigned</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUserDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Min 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.filter(r => r.is_active).map(role => (
                      <option key={role.id} value={role.name.toLowerCase()}>
                        {role.name} {role.description ? `- ${role.description}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The user will be created with this role and its associated permissions
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
