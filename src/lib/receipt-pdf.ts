import jsPDF from 'jspdf';

interface ReceiptData {
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  date: string;
  timeSlot: string;
  amount: number;
  paymentMethod: string;
  issuedAt?: string;
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 0;

  // Barber pole stripe
  doc.setFillColor(192, 57, 43); doc.rect(0, 0, w / 3, 4, 'F');
  doc.setFillColor(245, 240, 232); doc.rect(w / 3, 0, w / 3, 4, 'F');
  doc.setFillColor(27, 58, 107); doc.rect((w / 3) * 2, 0, w / 3, 4, 'F');

  // Header background
  y = 8;
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(margin, y, w - margin * 2, 30, 4, 4, 'F');
  doc.setTextColor(245, 240, 232);
  doc.setFontSize(22);
  doc.text('ARIK BARBER', w / 2, y + 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(155, 142, 126);
  doc.text('Professional Barbershop Services', w / 2, y + 22, { align: 'center' });

  // Receipt number bar
  y = 44;
  doc.setFillColor(247, 245, 242);
  doc.rect(margin, y, w - margin * 2, 14, 'F');
  doc.setFontSize(10);
  doc.setTextColor(155, 142, 126);
  doc.text('Receipt No.', w - margin - 2, y + 6, { align: 'right' });
  doc.setFontSize(16);
  doc.setTextColor(192, 57, 43);
  doc.text(data.receiptNumber, w - margin - 2, y + 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(155, 142, 126);
  doc.text('Date', margin + 2, y + 6, { align: 'left' });
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  const formattedDate = new Date(data.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(formattedDate, margin + 2, y + 12, { align: 'left' });

  // Divider
  y = 62;
  doc.setDrawColor(229, 224, 216);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, w - margin, y);
  doc.setLineDashPattern([], 0);

  // Customer details
  y = 68;
  doc.setFontSize(8);
  doc.setTextColor(155, 142, 126);
  doc.text('CLIENT DETAILS', w - margin, y, { align: 'right' });
  y += 7;
  const rows = [
    ['Name', data.customerName],
    ['Phone', data.customerPhone],
  ];
  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    doc.setTextColor(155, 142, 126);
    doc.text(label, w - margin, y, { align: 'right' });
    doc.setTextColor(26, 26, 26);
    doc.text(value, margin, y, { align: 'left' });
    y += 7;
  });

  // Divider
  y += 2;
  doc.setDrawColor(229, 224, 216);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, w - margin, y);
  doc.setLineDashPattern([], 0);

  // Service details
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(155, 142, 126);
  doc.text('SERVICE DETAILS', w - margin, y, { align: 'right' });
  y += 7;
  const serviceRows = [
    ['Service', data.serviceType],
    ['Time', data.timeSlot],
    ['Payment', data.paymentMethod],
  ];
  doc.setFontSize(10);
  serviceRows.forEach(([label, value]) => {
    doc.setTextColor(155, 142, 126);
    doc.text(label, w - margin, y, { align: 'right' });
    doc.setTextColor(26, 26, 26);
    doc.text(value, margin, y, { align: 'left' });
    y += 7;
  });

  // Divider
  y += 2;
  doc.setDrawColor(229, 224, 216);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, w - margin, y);
  doc.setLineDashPattern([], 0);

  // Total
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(155, 142, 126);
  doc.text('TOTAL', w - margin, y, { align: 'right' });
  y += 8;
  doc.setFontSize(28);
  doc.setTextColor(192, 57, 43);
  doc.text(`${data.amount} NIS`, margin, y, { align: 'left' });
  doc.setFontSize(10);
  doc.setTextColor(39, 174, 96);
  doc.text('PAID', w - margin, y, { align: 'right' });

  // Footer
  y += 16;
  doc.setDrawColor(229, 224, 216);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, w - margin, y);
  doc.setLineDashPattern([], 0);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(26, 26, 26);
  doc.text('Thank you for your visit!', w / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.text('See you next time!', w / 2, y, { align: 'center' });

  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('This document is a payment confirmation only and does not constitute a tax invoice', w / 2, y, { align: 'center' });

  y += 5;
  const now = data.issuedAt ? new Date(data.issuedAt) : new Date();
  doc.text(`Generated: ${now.toLocaleDateString('he-IL')} ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`, w / 2, y, { align: 'center' });

  // Bottom stripe
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(192, 57, 43); doc.rect(0, h - 4, w / 3, 4, 'F');
  doc.setFillColor(245, 240, 232); doc.rect(w / 3, h - 4, w / 3, 4, 'F');
  doc.setFillColor(27, 58, 107); doc.rect((w / 3) * 2, h - 4, w / 3, 4, 'F');

  return doc;
}
