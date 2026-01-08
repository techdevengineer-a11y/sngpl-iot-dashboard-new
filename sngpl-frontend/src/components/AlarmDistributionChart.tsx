import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlarmStats } from '../types/dashboard';

interface AlarmDistributionChartProps {
  alarmStats: AlarmStats | undefined;
}

const AlarmDistributionChart: React.FC<AlarmDistributionChartProps> = ({ alarmStats }) => {
  const data = [
    {
      name: 'Low Severity',
      value: alarmStats?.low_alarms || 12,
      color: '#22c55e'
    },
    {
      name: 'Medium Severity',
      value: alarmStats?.medium_alarms || 8,
      color: '#eab308'
    },
    {
      name: 'High Severity',
      value: alarmStats?.high_alarms || alarmStats?.critical_alarms || 3,
      color: '#ef4444'
    },
  ];

  const totalAlarms = data.reduce((sum, item) => sum + item.value, 0);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Alarm Distribution</h2>
        <div className="text-xs text-gray-400">
          Total: <span className="text-white font-semibold">{totalAlarms}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1'
            }}
            formatter={(value: number) => [`${value} alarms`, '']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend - Compact */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center p-2 bg-gray-800/30 rounded">
            <div className="flex items-center space-x-1 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-400">{item.name.split(' ')[0]}</span>
            </div>
            <span className="text-sm font-bold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlarmDistributionChart;
