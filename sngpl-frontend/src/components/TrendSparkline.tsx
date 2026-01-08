import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface TrendSparklineProps {
  data: number[];
  color?: string;
  trend?: 'up' | 'down' | 'stable';
}

const TrendSparkline: React.FC<TrendSparklineProps> = ({
  data,
  color = '#3b82f6',
  trend
}) => {
  const chartData = data.map((value, index) => ({ value, index }));

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend) {
      case 'up':
        return <span className="text-green-400 text-sm">↑</span>;
      case 'down':
        return <span className="text-red-400 text-sm">↓</span>;
      case 'stable':
        return <span className="text-gray-400 text-sm">→</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div style={{ width: 60, height: 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {getTrendIcon()}
    </div>
  );
};

export default TrendSparkline;
