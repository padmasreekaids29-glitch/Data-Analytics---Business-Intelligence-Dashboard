import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { formatShortMonth, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { MonthlySeriesPoint } from '../../types/index.ts';

interface ProfitLossChartProps {
  data: MonthlySeriesPoint[];
}

export function ProfitLossChart({ data }: ProfitLossChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: data.map((d) => formatShortMonth(d.month)),
    datasets: [
      {
        label: 'Cost of Sales',
        data: data.map((d) => d.cost),
        backgroundColor: theme === 'dark' ? '#475569' : '#94A3B8',
        borderRadius: 4,
        maxBarThickness: 18,
      },
      {
        label: 'Net Profit',
        data: data.map((d) => d.profit),
        backgroundColor: '#7C3AED',
        borderRadius: 4,
        maxBarThickness: 18,
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
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: tokens.tickColor, font: { size: 11 } },
      },
      y: {
        stacked: true,
        grid: { color: tokens.gridColor },
        ticks: {
          color: tokens.tickColor,
          font: { size: 11, family: 'JetBrains Mono' },
          callback: (val) => `$${(Number(val) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
