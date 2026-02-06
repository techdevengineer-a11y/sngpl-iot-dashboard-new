import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAlarms } from '../services/api';
import GlobalSearch from './GlobalSearch';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Sidebar menu items with gradient colors
  const menuItems = [
    { path: '/dashboard', label: 'DASHBOARD', icon: '📊', badge: null, gradient: 'from-blue-500 to-cyan-500' },
    { path: '/sections', label: 'SECTIONS', icon: '🏢', badge: null, gradient: 'from-green-500 to-emerald-500' },
    { path: '/alarms', label: 'ALERTS', icon: '🔔', badge: unreadCount, gradient: 'from-red-500 to-orange-500' },
    { path: '/advanced-reports', label: 'ADVANCED REPORTS', icon: '📈', badge: null, gradient: 'from-purple-500 to-pink-500' },
    { path: '/analytics-page', label: 'ANALYTICS', icon: '📊', badge: null, gradient: 'from-cyan-500 to-blue-500' },
    { path: '/device-management', label: 'MANAGE', icon: '⚙️', badge: null, gradient: 'from-indigo-500 to-blue-500' },
    { path: '/under-observation', label: 'UNDER OBSERVATION', icon: '👁️', badge: null, gradient: 'from-yellow-500 to-orange-500' },
    { path: '/odorant-drum', label: 'ODORANT DRUM', icon: '🛢️', badge: null, gradient: 'from-teal-500 to-cyan-500' },
    { path: '/map', label: 'MAP', icon: '🗺️', badge: null, gradient: 'from-green-500 to-teal-500' },
    { path: '/settings', label: 'SETTINGS', icon: '⚙️', badge: null, gradient: 'from-gray-500 to-slate-500' },
  ];

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const alarms = await getAlarms({ limit: 10 });
      const recentNotifications = alarms.slice(0, 5).map(alarm => ({
        id: alarm.id,
        title: `${alarm.severity.toUpperCase()}: ${alarm.parameter}`,
        message: `Device ${alarm.client_id} - ${alarm.value}`,
        timestamp: alarm.triggered_at,
        severity: alarm.severity,
        isRead: alarm.is_acknowledged
      }));
      setNotifications(recentNotifications);
      setUnreadCount(recentNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPageTitle = menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="h-screen flex relative overflow-hidden">
      {/* Animated Background Logo Watermark */}
      <div className="logo-watermark">
        <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full text-blue-600 animate-spin-slow">
          <circle cx="100" cy="100" r="80" opacity="0.1"/>
          <path d="M100 40 L140 80 L100 120 L60 80 Z" opacity="0.1"/>
          <text x="100" y="110" fontSize="40" textAnchor="middle" fontWeight="bold" opacity="0.15">SMS</text>
        </svg>
      </div>

      {/* Animated Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 bg-blue-400/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              animationName: 'particle-float',
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite'
            }}
          />
        ))}
      </div>

      {/* Floating Orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{animationDelay: '2s'}}></div>
      <div className="fixed top-1/2 left-1/3 w-64 h-64 bg-violet-400/5 rounded-full blur-3xl animate-float pointer-events-none" style={{animationDelay: '1s'}}></div>
      <div className="fixed top-1/3 right-1/4 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl animate-float pointer-events-none" style={{animationDelay: '3s'}}></div>

      {/* Additional ambient orbs */}
      <div className="fixed top-1/4 left-1/2 w-48 h-48 bg-cyan-400/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{animationDelay: '1.5s'}}></div>
      <div className="fixed bottom-1/3 right-1/3 w-56 h-56 bg-pink-400/5 rounded-full blur-3xl animate-float pointer-events-none" style={{animationDelay: '2.5s'}}></div>

      {/* ========== MOBILE TOP HEADER (visible < lg) ========== */}
      <header className="fixed top-0 left-0 right-0 h-14 enterprise-header flex items-center justify-between px-4 z-50 lg:hidden">
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img
              src="/assets/sngpl-logo.png"
              alt="SNGPL Logo"
              className="h-7 w-auto"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </Link>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{currentPageTitle}</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Notification bell */}
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setMobileMenuOpen(false);
            }}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          {/* Hamburger button */}
          <button
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setShowNotifications(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ========== MOBILE MENU OVERLAY ========== */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Full-screen menu */}
          <div className="fixed inset-0 z-50 lg:hidden bg-white overflow-y-auto animate-fade-in">
            {/* Menu header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <img
                  src="/assets/sngpl-logo.png"
                  alt="SNGPL Logo"
                  className="h-7 w-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="text-lg font-semibold text-gray-900">SMS Monitoring</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search bar */}
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSearch(true);
                }}
                className="w-full px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2 text-gray-600 border border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm flex-1 text-left">Search...</span>
              </button>
            </div>

            {/* Navigation items */}
            <nav className="p-3">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                      location.pathname === item.path
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg font-medium`
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge > 0 && (
                      <span className="px-2.5 py-1 bg-white text-red-600 text-xs rounded-full font-bold shadow-md animate-pulse border-2 border-red-500">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </nav>

            {/* User info and logout */}
            <div className="p-3 border-t border-gray-200 mt-2 space-y-2">
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-900">{user?.username}</div>
                <div className="text-xs text-gray-600 capitalize">{user?.role || 'Administrator'}</div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 border border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== DESKTOP SIDEBAR (hidden on mobile, visible lg+) ========== */}
      <aside className={`hidden lg:flex fixed left-0 top-0 h-screen enterprise-sidebar flex-col transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Logo and Collapse Toggle */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <Link to="/dashboard" className="flex items-center space-x-3">
              <img
                src="/assets/sngpl-logo.png"
                alt="SNGPL Logo"
                className="h-8 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-lg font-semibold text-gray-900">SMS Monitoring</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center justify-center mx-auto">
              <img
                src="/assets/sngpl-logo.png"
                alt="SNGPL Logo"
                className="h-7 w-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </Link>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Toolbar */}
        {!sidebarCollapsed && (
          <div className="p-3 border-b border-gray-200">
            {/* Global Search */}
            <button
              onClick={() => setShowSearch(true)}
              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2 text-gray-600 border border-gray-200"
              title="Search (Ctrl+K)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm flex-1 text-left">Search...</span>
              <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-500">⌘K</kbd>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  location.pathname === item.path
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105 font-medium`
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:scale-102'
                }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <div className="flex items-center space-x-3">
                  <span className={`${sidebarCollapsed ? 'text-2xl mx-auto' : 'text-base'} transition-transform`}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="text-sm">
                      {item.label}
                    </span>
                  )}
                </div>
                {/* Badge */}
                {!sidebarCollapsed && item.badge !== null && item.badge > 0 && (
                  <span className="px-2.5 py-1 bg-white text-red-600 text-xs rounded-full font-bold shadow-md animate-pulse border-2 border-red-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Info and Notifications */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          {/* Notifications */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-full px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-2 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-sm flex-1 text-left">NOTIFICATIONS</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-900">{user?.username}</div>
              <div className="text-xs text-gray-600 capitalize">{user?.role || 'Administrator'}</div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 border border-red-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Top Bar (desktop only) */}
        <header className="hidden lg:flex sticky top-0 enterprise-header h-14 items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center space-x-4">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">
              {currentPageTitle}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* Spacer for mobile header */}
        <div className="h-14 shrink-0 lg:hidden" />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-6 max-w-[1920px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className={`fixed ${sidebarCollapsed ? 'left-20' : 'left-4 lg:left-68'} top-16 lg:top-20 w-[calc(100vw-2rem)] sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-gray-900 font-semibold text-sm">Notifications</h3>
            <button
              onClick={() => {
                setShowNotifications(false);
                navigate('/alarms');
              }}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              View All
            </button>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/alarms');
                  }}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full ${
                      notification.severity === 'critical' ? 'bg-red-100 text-red-600' :
                      notification.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-gray-900 font-medium text-xs truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 truncate">
                        {notification.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {getTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 text-center">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/notifications');
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View All Notifications →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
};

export default Layout;
