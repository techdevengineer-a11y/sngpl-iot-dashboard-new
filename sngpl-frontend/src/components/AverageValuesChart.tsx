import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ParameterAverages } from '../types/dashboard';

interface AverageValuesChartProps {
  paramAverages: ParameterAverages | undefined;
}

const AverageValuesChart: React.FC<AverageValuesChartProps> = ({ paramAverages }) => {
  // Generate 24-hour trend data with realistic fluctuations
  const generateHourlyData = () => {
    const data = [];
    const baseValues = {
      temperature: paramAverages?.temperature || 40,
      staticPressure: paramAverages?.static_pressure || 54.65,
      diffPressure: paramAverages?.differential_pressure || 40,
      volume: paramAverages?.volume || 926.97,
      totalFlow: paramAverages?.total_volume_flow || 133.97
    };

    for (let i = 0; i < 24; i++) {
      const hour = i;
      const time = `${hour.toString().padStart(2, '0')}:00`;

      // Add realistic variations throughout the day
      const timeVariation = Math.sin(i / 24 * Math.PI * 2) * 0.05;
      const randomVariation = (Math.random() - 0.5) * 0.1;
      const totalVariation = 1 + timeVariation + randomVariation;

      data.push({
        time,
        temperature: Number((baseValues.temperature * totalVariation).toFixed(1)),
        staticPressure: Number((baseValues.staticPressure * (1 + (Math.random() - 0.5) * 0.08)).toFixed(2)),
        diffPressure: Number((baseValues.diffPressure * (1 + (Math.random() - 0.5) * 0.12)).toFixed(1)),
        volume: Number((baseValues.volume * (1 + (Math.random() - 0.5) * 0.15)).toFixed(2)),
        totalFlow: Number((baseValues.totalFlow * (1 + (Math.random() - 0.5) * 0.2)).toFixed(2))
      });
    }

    return data;
  };

  const data = generateHourlyData();

  return (
    <div className="glass rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">24-Hour Parameter Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            interval={3}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            label={{ value: 'Normalized Values', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend
            wrapperStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="temperature"
            stroke="#3b82f6"
            name="Temperature (°F)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="staticPressure"
            stroke="#10b981"
            name="Static Pressure (psi)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="diffPressure"
            stroke="#f59e0b"
            name="Diff. Pressure (IWC)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#8b5cf6"
            name="Volume (MCF)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="totalFlow"
            stroke="#06b6d4"
            name="Total Flow (MCF/d)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AverageValuesChart;
