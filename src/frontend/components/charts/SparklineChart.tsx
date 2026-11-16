import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';

interface SparklineChartProps {
  values: number[];
  positive?: boolean;
}

export function SparklineChart({ values, positive = true }: SparklineChartProps) {
  if (!values || values.length < 2) {
    return null;
  }

  const color = positive ? '#7C3AED' : '#DC2626';
  const fillColor = positive ? 'rgba(124, 58, 237, 0.12)' : 'rgba(220, 38, 38, 0.12)';

  const data = {
    labels: values.map((_, idx) => String(idx + 1)),
    datasets: [
      {
        data: values,
        borderColor: color,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.4,
        borderWidth: 1.8,
        pointRadius: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return <Line data={data} options={options} />;
}
