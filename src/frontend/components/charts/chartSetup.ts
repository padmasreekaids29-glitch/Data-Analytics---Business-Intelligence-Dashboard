import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const CHART_PALETTE = [
  '#7C3AED', // Primary Violet
  '#1E293B', // Deep Navy Slate
  '#4F46E5', // Indigo
  '#0D9488', // Emerald Teal
  '#D97706', // Amber
  '#EC4899', // Rose
];

export function formatShortMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${names[idx]} '${y.slice(2)}`;
}

export function getChartThemeTokens(isDark: boolean) {
  return {
    gridColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
    tickColor: isDark ? '#94A3B8' : '#64748B',
    legendColor: isDark ? '#CBD5E1' : '#334155',
    tooltipBg: isDark ? '#0F172A' : '#0B1120',
    tooltipBorder: isDark ? '#334155' : '#1E293B',
  };
}
