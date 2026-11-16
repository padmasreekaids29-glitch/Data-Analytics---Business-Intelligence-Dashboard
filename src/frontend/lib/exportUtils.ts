import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportResponse } from '../types/index.ts';

export function formatCurrency(value: number, currency = 'USD'): string {
  const symbolMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
  };
  const sym = symbolMap[currency] || '$';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`;
}

export function exportReportToPdf(report: ReportResponse, currency = 'USD'): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark Navy Header Strip
  doc.setFillColor(11, 17, 32);
  doc.rect(0, 0, pageWidth, 72, 'F');

  // Violet Accent Line
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 72, pageWidth, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INSIGHT PRO — Business Intelligence Report', 36, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  const titleLabel = report.reportType.replace(/_/g, ' ').toUpperCase();
  doc.text(
    `Report Type: ${titleLabel}   |   Generated: ${new Date(report.generatedAt).toLocaleString()}   |   Author: ${report.generatedBy}`,
    36,
    54
  );

  // Executive KPI Summary Row
  const kpis = [
    ['Total Revenue', formatCurrency(report.summary.totalRevenue, currency)],
    ['Net Profit', formatCurrency(report.summary.totalProfit, currency)],
    ['Profit Margin', `${report.summary.profitMarginPct}%`],
    ['Total Orders', report.summary.totalOrders.toLocaleString()],
    ['Units Sold', report.summary.totalUnits.toLocaleString()],
  ];

  const cardWidth = (pageWidth - 72 - 48) / 5;
  kpis.forEach(([label, val], idx) => {
    const x = 36 + idx * (cardWidth + 12);
    const y = 96;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, 54, 4, 4, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, x + 10, y + 18);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(val, x + 10, y + 40);
  });

  // Ledger Table
  autoTable(doc, {
    startY: 168,
    head: [
      [
        'Order #',
        'Date',
        'Customer',
        'Region',
        'Category',
        'Product',
        'Qty',
        'Revenue',
        'Profit',
        'Status',
      ],
    ],
    body: report.rows.slice(0, 120).map((r) => [
      r.orderNumber,
      r.saleDate,
      r.customerName,
      r.region,
      r.category,
      r.productName,
      String(r.quantity),
      formatCurrency(r.revenue, currency),
      formatCurrency(r.profit, currency),
      r.status,
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 36, right: 36 },
  });

  doc.save(`insight_pro_${report.reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
