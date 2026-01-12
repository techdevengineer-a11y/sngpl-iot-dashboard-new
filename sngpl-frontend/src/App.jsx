import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Create a client with optimized settings for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 60 seconds - dashboard data doesn't change that fast
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: false, // Disable automatic refetching, use manual polling where needed
    },
  },
});

// Lazy load all pages for code splitting and faster initial load
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Sections = lazy(() => import('./pages/Sections'));
const SectionDetail = lazy(() => import('./pages/SectionDetail.tsx'));
const StationDetail = lazy(() => import('./pages/StationDetail.tsx'));
const Trends = lazy(() => import('./pages/Trends.tsx'));
const Devices = lazy(() => import('./pages/Devices'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DeepAnalytics = lazy(() => import('./pages/DeepAnalytics'));
const Alarms = lazy(() => import('./pages/Alarms'));
const Map = lazy(() => import('./pages/Map'));
const LiveMonitor = lazy(() => import('./pages/LiveMonitor'));
const Reports = lazy(() => import('./pages/Reports'));
const AdvancedReports = lazy(() => import('./pages/AdvancedReports'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Favourites = lazy(() => import('./pages/Favourites'));
const UnderObservation = lazy(() => import('./pages/UnderObservation'));
const OdorantDrum = lazy(() => import('./pages/OdorantDrumNew'));
const LoadingScreen = lazy(() => import('./components/LoadingScreen'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-lg text-gray-300">Loading...</div>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-2xl text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/welcome" element={<LoadingScreen />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/sections" element={<PrivateRoute><Sections /></PrivateRoute>} />
        <Route path="/sections/:sectionId" element={<PrivateRoute><SectionDetail /></PrivateRoute>} />
        <Route path="/stations/:stationId" element={<PrivateRoute><StationDetail /></PrivateRoute>} />
        <Route path="/trends/:deviceId" element={<PrivateRoute><Trends /></PrivateRoute>} />
        <Route path="/devices" element={<PrivateRoute><Devices /></PrivateRoute>} />
        <Route path="/device-management" element={<PrivateRoute><DeviceManagement /></PrivateRoute>} />
        <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />
        <Route path="/live-monitor" element={<PrivateRoute><LiveMonitor /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/deep-analytics" element={<PrivateRoute><DeepAnalytics /></PrivateRoute>} />
        <Route path="/alarms" element={<PrivateRoute><Alarms /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/advanced-reports" element={<PrivateRoute><AdvancedReports /></PrivateRoute>} />
        <Route path="/analytics-page" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
        <Route path="/favourites" element={<PrivateRoute><Favourites /></PrivateRoute>} />
        <Route path="/under-observation" element={<PrivateRoute><UnderObservation /></PrivateRoute>} />
        <Route path="/odorant-drum" element={<PrivateRoute><OdorantDrum /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
