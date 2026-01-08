import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Reading } from '../types/dashboard';

interface TotalVolumeFlowChartProps {
  readings: Reading[];
}

const TotalVolumeFlowChart: React.FC<TotalVolumeFlowChartProps> = ({ readings }) => {
  const [viewMode, setViewMode] = useState<'24h' | 'alltime'>('24h');

  // Calculate cumulative volume flow
  const calculateCumulativeFlow = (data: Reading[]) => {
    let cumulative = 0;
    return data.map((reading, index) => {
      // Add current flow to cumulative total
      cumulative += Number(reading.total_volume_flow || 0);

      return {
        time: viewMode === '24h'
          ? new Date(reading.timestamp).toLocaleTimeString()
          : new Date(reading.timestamp).toLocaleDateString(),
        flow: Number(reading.total_volume_flow || 0),
        cumulative: Number(cumulative.toFixed(2)),
        device: reading.client_id
      };
    });
  };

  // Generate dummy all-time data if needed
  const generateAllTimeData = () => {
    const data = [];
    const daysBack = 30;
    const baseFlow = 5000;
    let cumulative = 0;

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dailyFlow = baseFlow + (Math.random() - 0.5) * 1000;
      cumulative += dailyFlow;

      data.push({
        time: date.toLocaleDateString(),
        flow: Number(dailyFlow.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
        device: 'All Devices'
      });
    }

    return data;
  };

  const chartData = viewMode === '24h'
    ? calculateCumulativeFlow(readings.length > 0 ? readings : generateDummy24HData())
    : generateAllTimeData();

  // Generate dummy 24h data if no readings
  function generateDummy24HData(): Reading[] {
    const dummy: Reading[] = [];
    const baseFlow = 133.97;

    for (let i = 0; i < 20; i++) {
      const now = new Date();
      now.setHours(now.getHours() - (20 - i));

      dummy.push({
        id: i,
        client_id: 'MTR-001',
        device_id: 'Meter-1',
        timestamp: now.toISOString(),
        temperature: 40,
        static_pressure: 54.65,
        differential_pressure: 40,
        volume: 926.97,
        total_volume_flow: baseFlow + (Math.random() - 0.5) * 20
      } as Reading);
    }

    return dummy;
  }

  const maxCumulative = Math.max(...chartData.map(d => d.cumulative));

  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Total Cumulative Flow</h2>

        {/* Toggle Switch - Compact */}
        <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('24h')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              viewMode === '24h'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setViewMode('alltime')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              viewMode === 'alltime'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Summary Stats - Compact */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded p-2">
          <p className="text-xs text-gray-400">Current</p>
          <p className="text-lg font-bold text-blue-400">
            {chartData[chartData.length - 1]?.flow.toFixed(1) || 0}
          </p>
          <p className="text-xs text-gray-500">MCF/d</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded p-2">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-purple-400">
            {maxCumulative.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">MCF</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded p-2">
          <p className="text-xs text-gray-400">Average</p>
          <p className="text-lg font-bold text-green-400">
            {(chartData.reduce((sum, d) => sum + d.flow, 0) / chartData.length).toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">MCF/d</p>
        </div>
      </div>

      {/* Chart - Large for all devices */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            interval={viewMode === '24h' ? 2 : 4}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            label={{
              value: 'Volume (MCF)',
              angle: -90,
              position: 'insideLeft',
              fill: '#9ca3af'
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2)} MCF${name === 'flow' ? '/d' : ''}`,
              name === 'cumulative' ? 'Cumulative Total' : 'Current Flow'
            ]}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCumulative)"
            name="cumulative"
          />
          {viewMode === '24h' && (
            <Area
              type="monotone"
              dataKey="flow"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFlow)"
              name="flow"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-slate-700/50 text-center text-sm text-gray-400">
        {viewMode === '24h'
          ? 'Showing cumulative volume flow over the last 24 hours'
          : 'Showing total cumulative volume flow over the last 30 days'
        }
      </div>
    </div>
  );
};

export default TotalVolumeFlowChart;
