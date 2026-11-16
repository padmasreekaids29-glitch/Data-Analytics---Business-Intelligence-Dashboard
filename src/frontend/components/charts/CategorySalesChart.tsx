import { Doughnut, Pie } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { CHART_PALETTE, getChartThemeTokens } from './chartSetup.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

interface CategorySalesChartProps {
  items: Array<{ label: string; value: number }>;
  variant?: 'doughnut' | 'pie';
}

export function CategorySalesChart({
  items,
  variant = 'doughnut',
}: CategorySalesChartProps) {
  const { theme } = useTheme();
  const tokens = getChartThemeTokens(theme === 'dark');

  const chartData = {
    labels: items.map((i) => i.label),
    datasets: [
      {
        data: items.map((i) => i.value),
        backgroundColor: items.map((_, idx) => CHART_PALETTE[idx % CHART_PALETTE.length]),
        borderColor: theme === 'dark' ? '#111A2E' : '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> & ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: variant === 'doughnut' ? '64%' : '0%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: tokens.legendColor,
          boxWidth: 10,
          padding: 14,
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
          label: (ctx) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const val = Number(ctx.parsed);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return `${ctx.label}: $${val.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  if (variant === 'pie') {
    return <Pie data={chartData} options={options} />;
  }
  return <Doughnut data={chartData} options={options} />;
}
