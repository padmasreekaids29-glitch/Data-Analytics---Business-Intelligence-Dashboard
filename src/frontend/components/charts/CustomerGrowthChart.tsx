import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { formatShortMonth, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { MonthlySeriesPoint } from '../../types/index.ts';

interface CustomerGrowthChartProps {
  data: MonthlySeriesPoint[];
}

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: data.map((d) => formatShortMonth(d.month)),
    datasets: [
      {
        label: 'Cumulative Active Customers',
        data: data.map((d) => d.cumulativeCustomers),
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.14)',
        fill: true,
        tension: 0.3,
        borderWidth: 2.2,
        pointRadius: 3,
      },
      {
        label: 'Active in Period',
        data: data.map((d) => d.activeCustomers),
        borderColor: '#0D9488',
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2.5,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
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
        beginAtZero: true,
        grid: { color: tokens.gridColor },
        ticks: {
          color: tokens.tickColor,
          precision: 0,
          font: { size: 11, family: 'JetBrains Mono' },
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
