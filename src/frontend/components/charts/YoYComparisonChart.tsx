import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { CHART_PALETTE, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { YearlyComparisonSeries } from '../../types/index.ts';

interface YoYComparisonChartProps {
  series: YearlyComparisonSeries[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YoYComparisonChart({ series }: YoYComparisonChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: MONTH_LABELS,
    datasets: series.map((yr, idx) => ({
      label: `FY ${yr.year}`,
      data: yr.months,
      borderColor: idx === series.length - 1 ? '#7C3AED' : CHART_PALETTE[(idx + 1) % CHART_PALETTE.length],
      backgroundColor: 'transparent',
      tension: 0.3,
      borderWidth: idx === series.length - 1 ? 2.8 : 2,
      borderDash: idx === series.length - 1 ? [] : [5, 4],
      pointRadius: 3,
    })),
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
          font: { size: 11.5, family: 'DM Sans' },
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
