# SNGPL IoT Dashboard - Frontend Documentation

## For Frontend Engineers

**Project:** SNGPL IoT Monitoring Dashboard
**Technology Stack:** React 18 + Vite + TypeScript + Tailwind CSS
**Last Updated:** January 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Main Libraries & Dependencies](#3-main-libraries--dependencies)
4. [All Pages & Their Locations](#4-all-pages--their-locations)
5. [All Components & Their Locations](#5-all-components--their-locations)
6. [Services & API Layer](#6-services--api-layer)
7. [State Management](#7-state-management)
8. [Custom Hooks](#8-custom-hooks)
9. [Utilities & Helpers](#9-utilities--helpers)
10. [Type Definitions](#10-type-definitions)
11. [Routing Structure](#11-routing-structure)
12. [Configuration Files](#12-configuration-files)
13. [Data Flow Architecture](#13-data-flow-architecture)
14. [Development Commands](#14-development-commands)

---

## 1. Project Overview

This is a **React-based IoT monitoring dashboard** for SNGPL (Sui Northern Gas Pipelines Limited). The application monitors gas pipeline devices, displays real-time sensor data, manages alarms, and generates reports.

**Key Features:**
- Real-time device monitoring via WebSocket
- Interactive maps with Leaflet
- Data visualization with Recharts and Chart.js
- Excel/CSV/PDF export capabilities
- Dark/Light theme support
- Role-based access control

---

## 2. Directory Structure

```
e:\final\github-backup\sngpl-frontend\
│
├── src/
│   ├── pages/                    # Full-page components (23 pages)
│   │   └── StationDetail/        # Sub-components for station page
│   │
│   ├── components/               # Reusable UI components (17 components)
│   │
│   ├── services/                 # API service layer
│   │   └── api.js                # Axios API functions
│   │
│   ├── contexts/                 # React Context providers
│   │   ├── AuthContext.jsx       # Authentication state
│   │   └── ThemeContext.jsx      # Theme state (dark/light)
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── useDashboardData.ts   # React Query hooks
│   │
│   ├── utils/                    # Utility functions
│   │   ├── alarmZones.ts         # Alarm threshold utilities
│   │   └── exportUtils.ts        # Export functions (CSV, Excel, PDF)
│   │
│   ├── types/                    # TypeScript type definitions
│   │   └── dashboard.ts          # Dashboard interfaces
│   │
│   ├── App.jsx                   # Root component with routing
│   ├── main.jsx                  # React DOM entry point
│   └── index.css                 # Global Tailwind styles
│
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── package.json                  # Dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS config
└── postcss.config.js             # PostCSS config
```

**Total Source Files:** 52 TypeScript/JavaScript files

---

## 3. Main Libraries & Dependencies

### Core Framework
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.2.0 | UI library |
| React Router DOM | 6.21.1 | Client-side routing |
| Vite | 5.0.11 | Build tool & dev server |
| TypeScript | 5.9.3 | Type checking |

### State Management & Data Fetching
| Library | Version | Purpose |
|---------|---------|---------|
| TanStack React Query | 5.90.11 | Server state & caching |
| Zustand | 4.4.7 | Client state (installed) |
| Axios | 1.6.5 | HTTP client |

### UI & Visualization
| Library | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | 3.4.1 | Utility-first CSS |
| Framer Motion | 10.18.0 | Animations |
| Lucide React | 0.307.0 | Icons |
| Recharts | 3.5.1 | Charts |
| Chart.js | 4.5.1 | Charts |
| react-chartjs-2 | 5.3.1 | Chart.js wrapper |
| Leaflet | 1.9.4 | Maps |
| react-leaflet | 4.2.1 | Leaflet wrapper |
| react-force-graph-2d | 1.29.0 | Network graphs |

### Utilities
| Library | Version | Purpose |
|---------|---------|---------|
| date-fns | 3.0.6 | Date formatting |
| xlsx | 0.18.5 | Excel export |
| xlsx-js-style | 1.2.0 | Styled Excel export |
| react-hot-toast | 2.4.1 | Toast notifications |

---

## 4. All Pages & Their Locations

### Location: `src/pages/`

| Page Name | File | Route | Description |
|-----------|------|-------|-------------|
| **Login** | `Login.jsx` | `/login` | Authentication page with animated background |
| **Dashboard** | `Dashboard.tsx` | `/dashboard` | Main dashboard with real-time metrics, battery status, alerts |
| **Sections** | `Sections.jsx` | `/sections` | Overview of all pipeline sections (I-V) with stats |
| **Section Detail** | `SectionDetail.tsx` | `/sections/:sectionId` | Detailed view of specific section devices |
| **Station Detail** | `StationDetail.tsx` | `/stations/:stationId` | Individual device monitoring with charts |
| **Trends** | `Trends.tsx` | `/trends/:deviceId` | Historical trend analysis with date filters |
| **Devices** | `Devices.jsx` | `/devices` | Device listing with search & filters |
| **Device Management** | `DeviceManagement.jsx` | `/device-management` | CRUD operations for devices |
| **Analytics** | `Analytics.jsx` | `/analytics` | Legacy analytics dashboard |
| **Deep Analytics** | `DeepAnalytics.jsx` | `/deep-analytics` | Advanced analytics features |
| **Analytics Page** | `AnalyticsPage.jsx` | `/analytics-page` | Modern analytics interface |
| **Alarms** | `Alarms.jsx` | `/alarms` | Alarm management & monitoring |
| **Section Alarms** | `SectionAlarms.jsx` | `/alarms/:sectionId` | Section-specific alarms |
| **Map** | `Map.jsx` | `/map` | Geographic visualization with Leaflet |
| **Live Monitor** | `LiveMonitor.jsx` | `/live-monitor` | Real-time device monitoring |
| **Reports** | `Reports.jsx` | `/reports` | Standard report generation |
| **Advanced Reports** | `AdvancedReports.jsx` | `/advanced-reports` | 6 AM reports, section comparison reports |
| **Odorant Drum** | `OdorantDrumNew.jsx` | `/odorant-drum` | Odorant drum monitoring |
| **Settings** | `Settings.jsx` | `/settings` | Application settings |
| **Notifications** | `Notifications.jsx` | `/notifications` | Notification center |
| **User Management** | `UserManagement.jsx` | `/users` | User administration |
| **Favourites** | `Favourites.jsx` | `/favourites` | Saved/favorited items |
| **Under Observation** | `UnderObservation.jsx` | `/under-observation` | Items being monitored |

### Sub-components: `src/pages/StationDetail/`

| File | Purpose |
|------|---------|
| `ChartParameterSidebars.tsx` | Parameter configuration sidebars for charts |
| `ParameterSidebar.tsx` | General parameter sidebar component |

---

## 5. All Components & Their Locations

### Location: `src/components/`

| Component | File | Purpose | Used In |
|-----------|------|---------|---------|
| **Layout** | `Layout.jsx` | Main layout with sidebar navigation | All pages |
| **GlobalSearch** | `GlobalSearch.jsx` | Search component (Ctrl+K) | Layout |
| **ThemeToggle** | `ThemeToggle.jsx` | Dark/light mode switcher | Layout |
| **LoadingScreen** | `LoadingScreen.jsx` | Loading/splash screen | App.jsx |
| **ExportModal** | `ExportModal.tsx` | Export data modal (CSV/Excel) | StationDetail, Reports |
| **AlarmIndicator** | `AlarmIndicator.tsx` | Visual alarm status indicator | Dashboard, Cards |
| **AlarmDistributionChart** | `AlarmDistributionChart.tsx` | Alarm distribution pie chart | Dashboard, Analytics |
| **AlarmZoneChart** | `AlarmZoneChart.tsx` | Chart with colored alarm zones | StationDetail |
| **AverageValuesChart** | `AverageValuesChart.tsx` | Average parameter values display | Dashboard |
| **TotalVolumeFlowChart** | `TotalVolumeFlowChart.tsx` | Volume flow line chart | Dashboard |
| **TopAlertingDevices** | `TopAlertingDevices.tsx` | List of devices with most alerts | Dashboard |
| **TrendSparkline** | `TrendSparkline.tsx` | Inline mini trend chart | Cards, Tables |
| **SystemToolbox** | `SystemToolbox.tsx` | System tools dropdown | Dashboard |
| **SiteOverview** | `SiteOverview.jsx` | High-level site summary | Dashboard |
| **StatusIndicatorsTable** | `StatusIndicatorsTable.jsx` | Device/parameter status table | Dashboard |
| **OdorantDrumSidebar** | `OdorantDrumSidebar.jsx` | Sidebar for odorant page | OdorantDrum |

---

## 6. Services & API Layer

### Location: `src/services/api.js`

### Axios Configuration
```javascript
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach Bearer token from sessionStorage
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Functions by Category

#### Authentication
| Function | Method | Endpoint |
|----------|--------|----------|
| `login(email, password)` | POST | `/auth/login` |
| `register(userData)` | POST | `/auth/register` |
| `getCurrentUser()` | GET | `/auth/me` |

#### Devices
| Function | Method | Endpoint |
|----------|--------|----------|
| `getDevices(params)` | GET | `/devices` |
| `getDeviceStats()` | GET | `/devices/stats` |
| `createDevice(data)` | POST | `/devices` |
| `updateDevice(id, data)` | PUT | `/devices/{id}` |
| `deleteDevice(id)` | DELETE | `/devices/{id}` |
| `getDeviceReadings(id, params)` | GET | `/devices/{id}/readings` |

#### Alarms
| Function | Method | Endpoint |
|----------|--------|----------|
| `getAlarms(params)` | GET | `/alarms` |
| `getAlarmStats()` | GET | `/alarms/stats` |
| `getAlarmsBySection(sectionId)` | GET | `/alarms/section/{id}` |
| `acknowledgeAlarm(id)` | POST | `/alarms/{id}/acknowledge` |
| `deleteAlarm(id)` | DELETE | `/alarms/{id}` |
| `getThresholds()` | GET | `/alarms/thresholds` |

#### Analytics & Readings
| Function | Method | Endpoint |
|----------|--------|----------|
| `getReadings(params)` | GET | `/readings` |
| `getAnalyticsSummary(params)` | GET | `/analytics/summary` |
| `exportReadingsCSV(params)` | GET | `/readings/export` |

#### Dashboard
| Function | Method | Endpoint |
|----------|--------|----------|
| `getDashboardRecentReadings(limit)` | GET | `/dashboard/readings/recent` |
| `getDashboardRecentAlarms(limit)` | GET | `/dashboard/alarms/recent` |
| `getSystemMetrics()` | GET | `/dashboard/metrics` |
| `getParameterAverages(hours)` | GET | `/dashboard/averages` |

#### User Management
| Function | Method | Endpoint |
|----------|--------|----------|
| `listUsers()` | GET | `/users` |
| `createUser(data)` | POST | `/users` |
| `updateUser(id, data)` | PUT | `/users/{id}` |
| `deleteUser(id)` | DELETE | `/users/{id}` |
| `changePassword(id, data)` | POST | `/users/{id}/change-password` |

#### Export Functions
| Function | Method | Endpoint |
|----------|--------|----------|
| `exportDevicesPDF()` | GET | `/export/devices/pdf` |
| `exportDevicesExcel()` | GET | `/export/devices/excel` |
| `exportAlarmsPDF()` | GET | `/export/alarms/pdf` |
| `exportAlarmsExcel()` | GET | `/export/alarms/excel` |

---

## 7. State Management

### Contexts: `src/contexts/`

#### AuthContext.jsx
```javascript
// Provides:
- user (object)      // Current logged-in user
- token (string)     // JWT token
- login(email, pw)   // Login function
- logout()           // Logout function
- loading (boolean)  // Auth loading state

// Storage: sessionStorage
```

#### ThemeContext.jsx
```javascript
// Provides:
- theme ('light' | 'dark')  // Current theme
- toggleTheme()             // Switch theme

// Storage: localStorage
```

### React Query (TanStack)
- Used for server state management
- Automatic caching and refetching
- 5-10 second refetch intervals for real-time data

---

## 8. Custom Hooks

### Location: `src/hooks/useDashboardData.ts`

| Hook | Refetch Interval | Returns |
|------|------------------|---------|
| `useDeviceStats()` | 5 seconds | Device count statistics |
| `useAlarmStats()` | 5 seconds | Alarm statistics by severity |
| `useHealth()` | 5 seconds | System health status |
| `useRecentReadings(limit)` | 5 seconds | Recent sensor readings |
| `useRecentAlarms(limit)` | 5 seconds | Recent alarms |
| `useSystemMetrics()` | 5 seconds | System metrics (uptime, etc.) |
| `useParameterAverages(hours)` | 5 seconds | Parameter averages |
| `useDevices()` | 10 seconds | All devices list |

### Usage Example:
```jsx
import { useDeviceStats, useAlarmStats } from '../hooks/useDashboardData';

function Dashboard() {
  const { data: deviceStats, isLoading } = useDeviceStats();
  const { data: alarmStats } = useAlarmStats();

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      <p>Total Devices: {deviceStats?.total}</p>
      <p>Active Alarms: {alarmStats?.active}</p>
    </div>
  );
}
```

---

## 9. Utilities & Helpers

### Location: `src/utils/`

#### alarmZones.ts
```typescript
// Constants
ALARM_THRESHOLDS = {
  temperature: { low: 32, high: 120 },
  static_pressure: { low: 10, high: 100 },
  differential_pressure: { low: 0, high: 300 },
  volume: { low: 0, high: 1000 }
}

// Functions
getAlarmSeverity(parameter, value)  // Returns: 'normal' | 'low' | 'medium' | 'high'
getAlarmZoneColor(severity)         // Returns: hex color string
countAlarmsBySeverity(alarms)       // Returns: { low, medium, high }
getMostSevereAlarm(alarms)          // Returns: most critical alarm
```

#### exportUtils.ts
```typescript
// Export Functions
exportToCSV(data, filename)    // Download as CSV
exportToJSON(data, filename)   // Download as JSON
exportToExcel(data, filename)  // Download as Excel (XML)
exportToPDF(data, title)       // Opens print dialog

// Formatting
formatDeviceDataForExport(readings)  // Format readings for export
exportStationSummary(station, data)  // Create station summary
```

---

## 10. Type Definitions

### Location: `src/types/dashboard.ts`

```typescript
interface Reading {
  id: number;
  device_id: number;
  timestamp: string;
  temperature: number;
  static_pressure: number;
  differential_pressure: number;
  volume: number;
  total_volume_flow: number;
  battery?: number;
}

interface Alarm {
  id: number;
  device_id: number;
  client_id: string;
  parameter: string;
  value: number;
  threshold_value: number;
  severity: 'low' | 'medium' | 'high';
  is_acknowledged: boolean;
  triggered_at: string;
}

interface Device {
  id: number;
  client_id: string;
  device_name: string;
  location: string;
  is_active: boolean;
  last_seen: string | null;
  device_type: 'SMS' | 'OTHER';
}

interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
  sms_count: number;
  other_count: number;
}

interface AlarmStats {
  total: number;
  active: number;
  acknowledged: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mqtt_connected: boolean;
  database_connected: boolean;
  last_reading_time: string;
}
```

---

## 11. Routing Structure

### Location: `src/App.jsx`

```jsx
// Public Routes (no authentication required)
/login          → Login.jsx
/welcome        → LoadingScreen.jsx

// Protected Routes (authentication required)
/dashboard              → Dashboard.tsx
/sections               → Sections.jsx
/sections/:sectionId    → SectionDetail.tsx
/stations/:stationId    → StationDetail.tsx
/trends/:deviceId       → Trends.tsx
/devices                → Devices.jsx
/device-management      → DeviceManagement.jsx
/map                    → Map.jsx
/live-monitor           → LiveMonitor.jsx
/analytics              → Analytics.jsx
/deep-analytics         → DeepAnalytics.jsx
/analytics-page         → AnalyticsPage.jsx
/alarms                 → Alarms.jsx
/alarms/:sectionId      → SectionAlarms.jsx
/reports                → Reports.jsx
/advanced-reports       → AdvancedReports.jsx
/odorant-drum           → OdorantDrumNew.jsx
/settings               → Settings.jsx
/notifications          → Notifications.jsx
/users                  → UserManagement.jsx
/favourites             → Favourites.jsx
/under-observation      → UnderObservation.jsx

// Default redirect
/                       → /dashboard
```

### Lazy Loading
All pages use React.lazy() for code splitting:
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sections = lazy(() => import('./pages/Sections'));
// etc...
```

---

## 12. Configuration Files

### vite.config.js
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
```

### tailwind.config.js
```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sngpl: {
          blue: '#1e40af',
          darkblue: '#1e3a8a',
          lightblue: '#3b82f6',
          green: '#16a34a'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  }
};
```

### Environment Variables (.env)
```
VITE_API_URL=/api
VITE_WS_URL=wss://sngpldashboard.online/ws
```

---

## 13. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LOGIN                            │
│                            ↓                                 │
│                 Token stored in sessionStorage               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     AUTH CONTEXT                             │
│              (user info, login/logout functions)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROTECTED ROUTES                           │
│                 (PrivateRoute component)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PAGE COMPONENTS                           │
│              (Dashboard, Sections, etc.)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 REACT QUERY HOOKS                            │
│           (useDeviceStats, useAlarmStats, etc.)              │
│           Auto-refetch every 5-10 seconds                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API SERVICE                               │
│                   (src/services/api.js)                      │
│              Axios with Bearer token header                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API                                │
│                 (FastAPI on port 8080)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      RESPONSE                                │
│                         ↓                                    │
│              React Query Cache                               │
│                         ↓                                    │
│                    UI Update                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    WEBSOCKET                                 │
│           (Real-time updates on Dashboard)                   │
│              wss://sngpldashboard.online/ws                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development URLs
- Frontend: http://localhost:5173
- API Proxy: http://localhost:8080/api
- WebSocket: wss://sngpldashboard.online/ws

---

## Quick Reference: File Locations

| What You're Looking For | File Location |
|------------------------|---------------|
| Main routing | `src/App.jsx` |
| API functions | `src/services/api.js` |
| Auth logic | `src/contexts/AuthContext.jsx` |
| Theme logic | `src/contexts/ThemeContext.jsx` |
| Dashboard page | `src/pages/Dashboard.tsx` |
| Device detail page | `src/pages/StationDetail.tsx` |
| Report generation | `src/pages/AdvancedReports.jsx` |
| Main layout/sidebar | `src/components/Layout.jsx` |
| Export modal | `src/components/ExportModal.tsx` |
| Chart components | `src/components/*Chart.tsx` |
| React Query hooks | `src/hooks/useDashboardData.ts` |
| TypeScript types | `src/types/dashboard.ts` |
| Utility functions | `src/utils/*.ts` |
| Tailwind config | `tailwind.config.js` |
| Vite config | `vite.config.js` |

---

## Contact & Support

For questions about this codebase, refer to:
- GitHub Repository: https://github.com/techdevengineer-a11y/sngpl-iot-dashboard
- Backend Documentation: See `sngpl-backend/` folder

---

*This documentation was generated for onboarding frontend engineers to the SNGPL IoT Dashboard project.*
