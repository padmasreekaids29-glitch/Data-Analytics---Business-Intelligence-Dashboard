import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { formatShortMonth, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { MonthlySeriesPoint } from '../../types/index.ts';

interface MonthlySalesChartProps {
  data: MonthlySeriesPoint[];
}

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: data.map((d) => formatShortMonth(d.month)),
    datasets: [
      {
        label: 'Orders',
        data: data.map((d) => d.orders),
        backgroundColor: '#7C3AED',
        borderRadius: 4,
        maxBarThickness: 22,
      },
      {
        label: 'Units Sold',
        data: data.map((d) => d.units),
        backgroundColor: theme === 'dark' ? '#334155' : '#CBD5E1',
        borderRadius: 4,
        maxBarThickness: 22,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: tokens.legendColor,
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 11, family: 'DM Sans' },
        },
      },
      tooltip: {
        backgroundColor: tokens.tooltipBg,
        borderColor: tokens.tooltipBorder,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tokens.tickColor, font: { size: 11 } },
      },
      y: {
        grid: { color: tokens.gridColor },
        ticks: {
          color: tokens.tickColor,
          font: { size: 11, family: 'JetBrains Mono' },
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
