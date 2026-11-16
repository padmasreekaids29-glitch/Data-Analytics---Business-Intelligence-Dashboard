import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { formatShortMonth, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { MonthlySeriesPoint } from '../../types/index.ts';

interface RevenueChartProps {
  data: MonthlySeriesPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: data.map((d) => formatShortMonth(d.month)),
    datasets: [
      {
        label: 'Gross Revenue',
        data: data.map((d) => d.revenue),
        borderColor: '#7C3AED',
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(124, 58, 237, 0.28)');
          gradient.addColorStop(1, 'rgba(124, 58, 237, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#7C3AED',
      },
      {
        label: 'Net Profit',
        data: data.map((d) => d.profit),
        borderColor: theme === 'dark' ? '#38BDF8' : '#0F172A',
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 2.5,
        pointHoverRadius: 5,
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
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toLocaleString()}`,
        },
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
          callback: (val) => `$${(Number(val) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
