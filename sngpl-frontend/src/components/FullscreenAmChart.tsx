import React, { useRef, useLayoutEffect } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { ArrowLeft } from 'lucide-react';

interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  strokeWidth?: number;
}

interface FullscreenAmChartProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  currentValue: string;
  currentValueColor: string;
  data: any[];
  series: SeriesConfig[];
  yAxisLabel: string;
}

const FullscreenAmChart: React.FC<FullscreenAmChartProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  currentValue,
  currentValueColor,
  data,
  series,
  yAxisLabel,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !chartRef.current || data.length === 0) return;

    // Create root
    const root = am5.Root.new(chartRef.current);
    rootRef.current = root;

    // Set theme
    root.setThemes([am5themes_Animated.new(root)]);

    // Create chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: false,
        wheelX: 'panX',
        wheelY: 'zoomX',
        pinchZoomX: true,
        layout: root.verticalLayout,
      })
    );

    // Create X axis (DateAxis)
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: 'minute', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 60,
        }),
        tooltip: am5.Tooltip.new(root, {}),
      })
    );
    xAxis.get('renderer').labels.template.setAll({
      fontSize: 12,
      fill: am5.color('#6b7280'),
    });

    // Create Y axis
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {}),
        extraMin: 0.05,
        extraMax: 0.1,
      })
    );
    yAxis.get('renderer').labels.template.setAll({
      fontSize: 13,
      fill: am5.color('#6b7280'),
    });
    // Y axis label
    yAxis.children.unshift(
      am5.Label.new(root, {
        text: yAxisLabel,
        rotation: -90,
        y: am5.p50,
        centerX: am5.p50,
        fill: am5.color('#374151'),
        fontSize: 14,
      })
    );

    // Add cursor
    const cursor = chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'zoomX',
      })
    );
    cursor.lineY.set('visible', false);

    // Process data - convert timestamps to numeric
    const processedData = data.map((d: any) => ({
      ...d,
      date: new Date(d.timestamp).getTime(),
    }));

    // Add series
    series.forEach((s) => {
      const lineSeries = chart.series.push(
        am5xy.LineSeries.new(root, {
          name: s.name,
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: s.dataKey,
          valueXField: 'date',
          stroke: am5.color(s.color),
          fill: am5.color(s.color),
          tooltip: am5.Tooltip.new(root, {
            labelText: `${s.name}: {valueY}`,
            pointerOrientation: 'horizontal',
          }),
        })
      );

      lineSeries.strokes.template.setAll({
        strokeWidth: s.strokeWidth || 2,
      });

      lineSeries.bullets.push(function () {
        return am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: 3,
            fill: am5.color(s.color),
            strokeWidth: 0,
          }),
        });
      });

      lineSeries.data.setAll(processedData);
    });

    // Add scrollbar with mini chart preview
    const scrollbar = chart.set(
      'scrollbarX',
      am5xy.XYChartScrollbar.new(root, {
        orientation: 'horizontal',
        height: 50,
      })
    );

    // Add mini series to scrollbar for preview
    const sbDateAxis = scrollbar.chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: 'minute', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {
          minorGridEnabled: true,
          opposite: false,
          strokeOpacity: 0,
        }),
      })
    );

    const sbValueAxis = scrollbar.chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {
          strokeOpacity: 0,
        }),
      })
    );

    // Add first series as preview in scrollbar
    const sbSeries = scrollbar.chart.series.push(
      am5xy.LineSeries.new(root, {
        valueYField: series[0].dataKey,
        valueXField: 'date',
        xAxis: sbDateAxis,
        yAxis: sbValueAxis,
        stroke: am5.color(series[0].color),
      })
    );
    sbSeries.data.setAll(processedData);

    // Add legend if multiple series
    if (series.length > 1) {
      const legend = chart.children.push(
        am5.Legend.new(root, {
          centerX: am5.p50,
          x: am5.p50,
        })
      );
      legend.data.setAll(chart.series.values);
    }

    // Animate on load
    chart.appear(1000, 100);

    return () => {
      root.dispose();
      rootRef.current = null;
    };
  }, [isOpen, data, series, yAxisLabel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <span className={`text-sm font-medium ${currentValueColor}`}>{currentValue}</span>
      </div>
      <div className="flex-1 p-4">
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default FullscreenAmChart;
