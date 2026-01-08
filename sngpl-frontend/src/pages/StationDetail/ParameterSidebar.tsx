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
      className="fixed top-0 bottom-0 right-0 bg-white border-l-2 border-gray-300 flex flex-col shadow-lg"
      style={{ width: `${width}px` }}
    >
      <div className="p-4 bg-gray-100 border-b border-gray-300">
        <h3 className="text-sm font-bold text-gray-900 uppercase">Live Parameters</h3>
        <p className="text-xs text-gray-600 mt-1">{deviceData.device_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {/* Temperature */}
        <div className="bg-white rounded p-3 border-l-4 border-orange-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Temperature</span>
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {latest?.temperature?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">°F</span>
          </div>
          <div className={`text-xs font-semibold mt-1 ${getTemperatureColor(latest?.temperature || 0).text}`}>
            {getTemperatureColor(latest?.temperature || 0).status}
          </div>
        </div>

        {/* Static Pressure */}
        <div className="bg-white rounded p-3 border-l-4 border-green-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Static Pressure</span>
            <Gauge className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {latest?.static_pressure?.toFixed(1) || '0.0'}
            <span className="text-sm text-gray-600 ml-1">PSI</span>
          </div>
          <div className={`text-xs font-semibold mt-1 ${getStaticPressureColor(latest?.static_pressure || 0).text}`}>
            {getStaticPressureColor(latest?.static_pressure || 0).status}
          </div>
        </div>

        {/* Max Static Pressure */}
        <div className="bg-white rounded p-3 border-l-4 border-blue-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Max Static P</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {latest?.max_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">PSI</span>
          </div>
        </div>

        {/* Min Static Pressure */}
        <div className="bg-white rounded p-3 border-l-4 border-indigo-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Min Static P</span>
            <TrendingUp className="w-4 h-4 text-indigo-400 transform rotate-180" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {latest?.min_static_pressure?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">PSI</span>
          </div>
        </div>

        {/* Differential Pressure */}
        <div className="bg-white rounded p-3 border-l-4 border-blue-400 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Diff Pressure</span>
            <Wind className="w-4 h-4 text-blue-300" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {latest?.differential_pressure?.toFixed(2) || '0.00'}
            <span className="text-xs text-gray-600 ml-1">IWC</span>
          </div>
          <div className={`text-xs font-semibold mt-1 ${getDifferentialPressureColor(latest?.differential_pressure || 0).text}`}>
            {getDifferentialPressureColor(latest?.differential_pressure || 0).status}
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white rounded p-3 border-l-4 border-purple-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Volume</span>
            <Droplets className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {latest?.volume?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">MCF</span>
          </div>
        </div>

        {/* Flow Rate */}
        <div className="bg-white rounded p-3 border-l-4 border-cyan-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Flow Rate</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {latest?.total_volume_flow?.toFixed(1) || '0.0'}
            <span className="text-xs text-gray-600 ml-1">MCF/day</span>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-white rounded p-3 border-l-4 border-yellow-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Battery</span>
            <Battery className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {batteryLevel.toFixed(2)}
            <span className="text-xs text-gray-600 ml-1">V</span>
          </div>
          <div className={`text-xs font-semibold mt-1 ${getBatteryColor(batteryLevel).text}`}>
            {getBatteryColor(batteryLevel).status}
          </div>
        </div>
      </div>

      <div className="p-3 bg-gray-900 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Last Update:</span>
            <span className="text-white font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className={`font-semibold ${deviceData.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {deviceData.is_active ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

ParameterSidebar.displayName = 'ParameterSidebar';
