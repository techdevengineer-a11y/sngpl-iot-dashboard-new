import React from 'react';
import {
  Thermometer,
  Gauge,
  Wind,
  Droplets,
  TrendingUp,
  Battery
} from 'lucide-react';

interface DeviceData {
  device_name: string;
  is_active: boolean;
}

interface LatestReading {
  temperature?: number;
  static_pressure?: number;
  max_static_pressure?: number;
  min_static_pressure?: number;
  differential_pressure?: number;
  volume?: number;
  total_volume_flow?: number;
}

interface BaseParameterSidebarProps {
  width: number;
  deviceData: DeviceData;
  latest: LatestReading;
}

interface TemperatureParameterSidebarProps extends BaseParameterSidebarProps {
  getTemperatureColor: (temp: number) => { text: string; status: string };
}

interface PressureParameterSidebarProps extends BaseParameterSidebarProps {
  getStaticPressureColor: (pressure: number) => { text: string; status: string };
}

interface DifferentialPressureParameterSidebarProps extends BaseParameterSidebarProps {
  getDifferentialPressureColor: (pressure: number) => { text: string; status: string };
}

interface VolumeParameterSidebarProps extends BaseParameterSidebarProps {}

interface FlowRateParameterSidebarProps extends BaseParameterSidebarProps {}

interface BatteryParameterSidebarProps extends BaseParameterSidebarProps {
  batteryLevel: number;
  getBatteryColor: (voltage: number) => { text: string; status: string };
}

// Temperature Parameter Sidebar
export const TemperatureParameterSidebar: React.FC<TemperatureParameterSidebarProps> = React.memo((({
  width,
  deviceData,
  latest,
  getTemperatureColor
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 border-b border-orange-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Temperature</h3>
        <p className="text-xs text-orange-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full bg-gradient-to-br from-orange-50 to-white backdrop-blur-sm rounded-xl p-8 border-l-4 border-orange-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Temperature</span>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Thermometer className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            {latest?.temperature?.toFixed(1) || '0.0'}
            <span className="text-2xl text-gray-600 ml-2">°F</span>
          </div>
          <div className={`text-sm font-bold ${getTemperatureColor(latest?.temperature || 0).text}`}>
            {getTemperatureColor(latest?.temperature || 0).status}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}));

TemperatureParameterSidebar.displayName = 'TemperatureParameterSidebar';

// Pressure Parameter Sidebar (Static/Max/Min)
export const PressureParameterSidebar: React.FC<PressureParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest,
  getStaticPressureColor
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 border-b border-green-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Pressure</h3>
        <p className="text-xs text-green-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Static Pressure */}
        <div className="bg-gradient-to-br from-green-50 to-white backdrop-blur-sm rounded-xl p-6 border-l-4 border-green-500 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Static Pressure</span>
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Gauge className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {latest?.static_pressure?.toFixed(1) || '0.0'}
            <span className="text-lg text-gray-600 ml-1">PSI</span>
          </div>
          <div className={`text-sm font-bold mt-3 ${getStaticPressureColor(latest?.static_pressure || 0).text}`}>
            {getStaticPressureColor(latest?.static_pressure || 0).status}
          </div>
        </div>

        {/* Max Static Pressure */}
        <div className="bg-gradient-to-br from-blue-50 to-white backdrop-blur-sm rounded-xl p-5 border-l-4 border-blue-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max Static P</span>
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {latest?.max_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">PSI</span>
          </div>
        </div>

        {/* Min Static Pressure */}
        <div className="bg-gradient-to-br from-indigo-50 to-white backdrop-blur-sm rounded-xl p-5 border-l-4 border-indigo-500 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Min Static P</span>
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-indigo-500 transform rotate-180" />
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {latest?.min_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">PSI</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

PressureParameterSidebar.displayName = 'PressureParameterSidebar';

// Differential Pressure Parameter Sidebar
export const DifferentialPressureParameterSidebar: React.FC<DifferentialPressureParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest,
  getDifferentialPressureColor
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 border-b border-blue-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Diff Pressure</h3>
        <p className="text-xs text-blue-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full bg-gradient-to-br from-cyan-50 to-white backdrop-blur-sm rounded-xl p-8 border-l-4 border-cyan-400 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Diff Pressure</span>
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Wind className="w-6 h-6 text-cyan-500" />
            </div>
          </div>
          <div className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
            {latest?.differential_pressure?.toFixed(2) || '0.00'}
            <span className="text-2xl text-gray-600 ml-2">IWC</span>
          </div>
          <div className={`text-sm font-bold ${getDifferentialPressureColor(latest?.differential_pressure || 0).text}`}>
            {getDifferentialPressureColor(latest?.differential_pressure || 0).status}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

DifferentialPressureParameterSidebar.displayName = 'DifferentialPressureParameterSidebar';

// Volume Parameter Sidebar
export const VolumeParameterSidebar: React.FC<VolumeParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-b border-purple-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Volume</h3>
        <p className="text-xs text-purple-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full bg-gradient-to-br from-purple-50 to-white backdrop-blur-sm rounded-xl p-8 border-l-4 border-purple-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Volume</span>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Droplets className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            {latest?.volume?.toFixed(1) || '0.0'}
            <span className="text-2xl text-gray-600 ml-2">MCF</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

VolumeParameterSidebar.displayName = 'VolumeParameterSidebar';

// Flow Rate Parameter Sidebar
export const FlowRateParameterSidebar: React.FC<FlowRateParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 border-b border-teal-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Flow Rate</h3>
        <p className="text-xs text-teal-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full bg-gradient-to-br from-teal-50 to-white backdrop-blur-sm rounded-xl p-8 border-l-4 border-teal-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Flow Rate</span>
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-teal-500" />
            </div>
          </div>
          <div className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            {latest?.total_volume_flow?.toFixed(1) || '0.0'}
            <span className="text-2xl text-gray-600 ml-2">MCF/day</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

FlowRateParameterSidebar.displayName = 'FlowRateParameterSidebar';

// Battery Parameter Sidebar
export const BatteryParameterSidebar: React.FC<BatteryParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest,
  batteryLevel,
  getBatteryColor
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 border-b border-yellow-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Battery</h3>
        <p className="text-xs text-yellow-100 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full bg-gradient-to-br from-yellow-50 to-white backdrop-blur-sm rounded-xl p-8 border-l-4 border-yellow-500 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Battery</span>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Battery className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <div className="text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-4">
            {batteryLevel.toFixed(2)}
            <span className="text-2xl text-gray-600 ml-2">V</span>
          </div>
          <div className={`text-sm font-bold ${getBatteryColor(batteryLevel).text}`}>
            {getBatteryColor(batteryLevel).status}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black border-t border-slate-700 shadow-inner">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Last Update:</span>
            <span className="text-white font-mono font-semibold bg-slate-800/50 px-2 py-0.5 rounded">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full ${deviceData.is_active ? 'text-green-400 bg-green-400/20 ring-1 ring-green-400/30' : 'text-red-400 bg-red-400/20 ring-1 ring-red-400/30'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

BatteryParameterSidebar.displayName = 'BatteryParameterSidebar';
