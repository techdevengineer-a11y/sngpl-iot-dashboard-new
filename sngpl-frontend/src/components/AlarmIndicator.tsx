import React from 'react';
import { AlarmSeverity } from '../types/dashboard';

interface AlarmIndicatorProps {
  severity: AlarmSeverity | null;
  lowCount?: number;
  mediumCount?: number;
  highCount?: number;
  showCounts?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AlarmIndicator: React.FC<AlarmIndicatorProps> = ({
  severity,
  lowCount = 0,
  mediumCount = 0,
  highCount = 0,
  showCounts = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const lightSize = sizeClasses[size];

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1.5">
        {/* Low Alarm Light - Green */}
        <div className="flex flex-col items-center">
          <div
            className={`${lightSize} rounded-full transition-all duration-300 ${
              severity === 'low'
                ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse'
                : lowCount > 0
                ? 'bg-green-600/70'
                : 'bg-gray-700 border border-gray-600'
            }`}
            title={`Low Alarms: ${lowCount}`}
          />
          {showCounts && lowCount > 0 && (
            <span className="text-xs text-green-400 mt-0.5">{lowCount}</span>
          )}
        </div>

        {/* Medium Alarm Light - Yellow/Amber */}
        <div className="flex flex-col items-center">
          <div
            className={`${lightSize} rounded-full transition-all duration-300 ${
              severity === 'medium'
                ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse'
                : mediumCount > 0
                ? 'bg-yellow-600/70'
                : 'bg-gray-700 border border-gray-600'
            }`}
            title={`Medium Alarms: ${mediumCount}`}
          />
          {showCounts && mediumCount > 0 && (
            <span className="text-xs text-yellow-400 mt-0.5">{mediumCount}</span>
          )}
        </div>

        {/* High Alarm Light - Red */}
        <div className="flex flex-col items-center">
          <div
            className={`${lightSize} rounded-full transition-all duration-300 ${
              severity === 'high'
                ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                : highCount > 0
                ? 'bg-red-600/70'
                : 'bg-gray-700 border border-gray-600'
            }`}
            title={`High Alarms: ${highCount}`}
          />
          {showCounts && highCount > 0 && (
            <span className="text-xs text-red-400 mt-0.5">{highCount}</span>
          )}
        </div>
      </div>

      {/* Current Status Text */}
      {severity && (
        <div className="ml-2">
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              severity === 'high'
                ? 'bg-red-500/20 text-red-400'
                : severity === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
            }`}
          >
            {severity.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};

export default AlarmIndicator;
