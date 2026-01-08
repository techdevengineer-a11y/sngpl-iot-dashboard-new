import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import AlarmIndicator from './AlarmIndicator';
import { AlarmSeverity } from '../types/dashboard';
import { ALARM_THRESHOLDS, countAlarmsBySeverity, getMostSevereAlarm } from '../utils/alarmZones';

interface ChartDataPoint {
  time: string;
  value: number;
  [key: string]: any;
}

interface AlarmZoneChartProps {
  data: ChartDataPoint[];
  dataKey: string;
  parameter: string;
  title: string;
  unit: string;
  color: string;
  yAxisDomain?: [number, number];
  height?: number;
}

const AlarmZoneChart: React.FC<AlarmZoneChartProps> = ({
  data,
  dataKey,
  parameter,
  title,
  unit,
  color,
  yAxisDomain,
  height = 350
}) => {
  const threshold = ALARM_THRESHOLDS[parameter];

  // Calculate alarm counts and current severity
  const values = data.map(d => d.value);
  const alarmCounts = countAlarmsBySeverity(values, parameter);
  const currentSeverity = values.length > 0 ? getMostSevereAlarm([values[values.length - 1]], parameter) : null;

  const [minY, maxY] = yAxisDomain || [threshold?.low.min || 0, threshold?.high.max || 100];

  return (
    <div className="glass rounded-xl p-6">
      {/* Header with title and alarm indicator */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <AlarmIndicator
          severity={currentSeverity}
          lowCount={alarmCounts.low}
          mediumCount={alarmCounts.medium}
          highCount={alarmCounts.high}
          showCounts={true}
          size="md"
        />
      </div>

      {/* Alarm Zone Summary */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500/30 border border-green-500 rounded"></div>
            <span className="text-gray-400">Low: {threshold?.low.min}-{threshold?.low.max} {unit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500/30 border border-yellow-500 rounded"></div>
            <span className="text-gray-400">Medium: {threshold?.medium.min}-{threshold?.medium.max} {unit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500/30 border border-red-500 rounded"></div>
            <span className="text-gray-400">High: {threshold?.high.min}+ {unit}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${parameter}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* Alarm Zone Background Areas */}
          {threshold && (
            <>
              {/* Low Zone (Green) */}
              <ReferenceArea
                y1={threshold.low.min}
                y2={threshold.low.max}
                fill="rgba(34, 197, 94, 0.08)"
                fillOpacity={1}
                strokeOpacity={0}
              />

              {/* Medium Zone (Yellow) */}
              <ReferenceArea
                y1={threshold.medium.min}
                y2={threshold.medium.max}
                fill="rgba(245, 158, 11, 0.08)"
                fillOpacity={1}
                strokeOpacity={0}
              />

              {/* High Zone (Red) */}
              <ReferenceArea
                y1={threshold.high.min}
                y2={maxY}
                fill="rgba(239, 68, 68, 0.08)"
                fillOpacity={1}
                strokeOpacity={0}
              />

              {/* Threshold Lines */}
              <ReferenceLine
                y={threshold.medium.min}
                stroke="rgba(245, 158, 11, 0.5)"
                strokeDasharray="3 3"
                strokeWidth={2}
              />
              <ReferenceLine
                y={threshold.high.min}
                stroke="rgba(239, 68, 68, 0.5)"
                strokeDasharray="3 3"
                strokeWidth={2}
              />
            </>
          )}

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            style={{ fontSize: '11px', fontWeight: '500' }}
          />
          <YAxis
            stroke="#94a3b8"
            domain={[minY, maxY]}
            style={{ fontSize: '11px', fontWeight: '500' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
            formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
          />

          {/* Data Area */}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fill={`url(#gradient-${parameter})`}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Alarm Status Footer */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Current: <span className="text-white font-semibold">{values[values.length - 1]?.toFixed(2) || 'N/A'} {unit}</span></span>
          <span>Total Alarms: <span className="text-white font-semibold">{alarmCounts.low + alarmCounts.medium + alarmCounts.high}</span></span>
        </div>
      </div>
    </div>
  );
};

export default AlarmZoneChart;
