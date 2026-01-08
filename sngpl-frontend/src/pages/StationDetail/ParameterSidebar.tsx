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

interface ParameterSidebarProps {
  width: number;
  deviceData: DeviceData;
  latest: LatestReading;
  batteryLevel: number;
  getTemperatureColor: (temp: number) => { text: string; status: string };
  getStaticPressureColor: (pressure: number) => { text: string; status: string };
  getDifferentialPressureColor: (pressure: number) => { text: string; status: string };
  getBatteryColor: (voltage: number) => { text: string; status: string };
}

export const ParameterSidebar: React.FC<ParameterSidebarProps> = React.memo(({
  width,
  deviceData,
  latest,
  batteryLevel,
  getTemperatureColor,
  getStaticPressureColor,
  getDifferentialPressureColor,
  getBatteryColor
}) => {
  return (
    <div
      className="fixed top-0 bottom-0 right-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 border-l border-slate-200 flex flex-col shadow-2xl backdrop-blur-sm"
      style={{ width: `${width}px` }}
    >
      <div className="p-5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 border-b border-slate-600 shadow-md">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-md">Live Parameters</h3>
        <p className="text-xs text-slate-300 mt-1.5 font-medium">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Temperature */}
        <div className="bg-gradient-to-br from-orange-50 to-white backdrop-blur-sm rounded-xl p-4 border-l-4 border-orange-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Temperature</span>
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <Thermometer className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            {latest?.temperature?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">°F</span>
          </div>
          <div className={`text-xs font-bold mt-2 ${getTemperatureColor(latest?.temperature || 0).text}`}>
            {getTemperatureColor(latest?.temperature || 0).status}
          </div>
        </div>

        {/* Static Pressure */}
        <div className="bg-gradient-to-br from-green-50 to-white backdrop-blur-sm rounded-xl p-4 border-l-4 border-green-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Static Pressure</span>
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Gauge className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {latest?.static_pressure?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">PSI</span>
          </div>
          <div className={`text-xs font-bold mt-2 ${getStaticPressureColor(latest?.static_pressure || 0).text}`}>
            {getStaticPressureColor(latest?.static_pressure || 0).status}
          </div>
        </div>

        {/* Max Static Pressure */}
        <div className="bg-gradient-to-br from-blue-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max Static P</span>
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {latest?.max_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">PSI</span>
          </div>
        </div>

        {/* Min Static Pressure */}
        <div className="bg-gradient-to-br from-indigo-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Min Static P</span>
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500 transform rotate-180" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {latest?.min_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">PSI</span>
          </div>
        </div>

        {/* Differential Pressure */}
        <div className="bg-gradient-to-br from-cyan-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-cyan-400 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Diff Pressure</span>
            <div className="p-1.5 bg-cyan-100 rounded-lg">
              <Wind className="w-3.5 h-3.5 text-cyan-500" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {latest?.differential_pressure?.toFixed(2) || '0.00'}
            <span className="text-xs text-gray-600 ml-1">IWC</span>
          </div>
          <div className={`text-xs font-bold mt-2 ${getDifferentialPressureColor(latest?.differential_pressure || 0).text}`}>
            {getDifferentialPressureColor(latest?.differential_pressure || 0).status}
          </div>
        </div>

        {/* Volume */}
        <div className="bg-gradient-to-br from-purple-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-purple-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Volume</span>
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Droplets className="w-3.5 h-3.5 text-purple-500" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {latest?.volume?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">MCF</span>
          </div>
        </div>

        {/* Flow Rate */}
        <div className="bg-gradient-to-br from-teal-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-teal-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Flow Rate</span>
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            {latest?.total_volume_flow?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">MCF/day</span>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-gradient-to-br from-yellow-50 to-white backdrop-blur-sm rounded-xl p-3.5 border-l-4 border-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Battery</span>
            <div className="p-1.5 bg-yellow-100 rounded-lg">
              <Battery className="w-3.5 h-3.5 text-yellow-500" />
            </div>
          </div>
          <div className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {batteryLevel.toFixed(2)}
            <span className="text-xs text-gray-600 ml-1">V</span>
          </div>
          <div className={`text-xs font-bold mt-2 ${getBatteryColor(batteryLevel).text}`}>
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

ParameterSidebar.displayName = 'ParameterSidebar';
