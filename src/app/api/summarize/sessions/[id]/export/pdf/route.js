import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import db from '@/services/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = db.getSummarySession(id);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Summary not found.' }, { status: 404 });
    }
    const { summary, fileName } = session;

    const pdfDoc = new PDFDocument({ margin: 50 });
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));

    pdfDoc.font('Helvetica-Bold').fontSize(22).fillColor('#4f46e5').text('TalentProof — Document Summary', { align: 'center' });
    pdfDoc.font('Helvetica').fontSize(10).fillColor('#64748b').text(`Original: ${fileName}`, { align: 'center' });
    pdfDoc.text(`Created: ${new Date(session.date).toLocaleDateString()}`, { align: 'center' });
    pdfDoc.font('Helvetica-Bold').fontSize(9).fillColor('#4b5563');
    pdfDoc.text(`Sentiment: ${summary.sentiment || 'Neutral'}  |  Complexity: ${summary.readabilityScore || 'Medium'}  |  Time: ~${summary.estimatedReadingTime || 4} min`, { align: 'center' });
    if (summary.topics && summary.topics.length > 0) {
      pdfDoc.font('Helvetica-Oblique').fontSize(9).fillColor('#6b7280').text(`Topics: ${summary.topics.join(', ')}`, { align: 'center' });
    }
    pdfDoc.moveDown(1.5);

    pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Overview');
    pdfDoc.font('Helvetica-Oblique').fontSize(11).fillColor('#475569').text(summary.shortSummary || 'N/A');
    pdfDoc.moveDown(1.0);

    pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Detailed Breakdown');
    pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155').text(summary.detailedSummary || 'N/A', { lineGap: 3 });
    pdfDoc.moveDown(1.2);

    pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Key Takeaways');
    (summary.keyPoints || []).forEach((point, i) => {
      pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155').text(`  ${i + 1}. ${point}`, { lineGap: 2 });
    });
    pdfDoc.moveDown(1.2);

    pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Action Items');
    (summary.actionItems || []).forEach((action) => {
      pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155').text(`  [ ] ${action}`, { lineGap: 2 });
    });
    pdfDoc.moveDown(1.2);

    if (summary.importantDates && summary.importantDates.length > 0) {
      pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Key Dates');
      summary.importantDates.forEach((date) => {
        pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155').text(`  • ${date}`, { lineGap: 2 });
      });
      pdfDoc.moveDown(1.2);
    }

    if (summary.importantNumbers && summary.importantNumbers.length > 0) {
      pdfDoc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text('Significant Figures & Metrics');
      summary.importantNumbers.forEach((number) => {
        pdfDoc.font('Helvetica').fontSize(10).fillColor('#334155').text(`  • ${number}`, { lineGap: 2 });
      });
    }

    pdfDoc.end();
    const pdfBuffer = await new Promise((resolve) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Summary_${encodeURIComponent(fileName.replace(/\.[^/.]+$/, ''))}.pdf"`
      }
    });
  } catch (error) {
    console.error('Failed to export PDF summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
