import { NextResponse } from 'next/server';
import * as docx from 'docx';
import db from '@/services/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const session = db.getSummarySession(id);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Summary not found.' }, { status: 404 });
    }
    const { summary, fileName } = session;

    const docxDoc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            spacing: { after: 120 },
            children: [
              new docx.TextRun({ text: 'TalentProof — Document Summary', size: 36, bold: true, color: '4f46e5' })
            ]
          }),
          new docx.Paragraph({
            spacing: { after: 360 },
            children: [
              new docx.TextRun({ text: `Source Document: ${fileName}\n`, size: 20, color: '64748b' }),
              new docx.TextRun({ text: `Generated: ${new Date(session.date).toLocaleDateString()}\n`, size: 20, color: '64748b' }),
              new docx.TextRun({ text: `Sentiment: ${summary.sentiment || 'Neutral'}  |  Readability: ${summary.readabilityScore || 'Medium'}  |  Reading Time: ~${summary.estimatedReadingTime || 4} min\n`, size: 20, bold: true, color: '4f46e5' }),
              new docx.TextRun({ text: `Topics: ${summary.topics?.join(', ') || 'None'}`, size: 18, color: '4b5563', italic: true })
            ]
          }),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Overview', size: 28, bold: true, color: '1e293b' })]
          }),
          new docx.Paragraph({
            spacing: { after: 240 },
            children: [new docx.TextRun({ text: summary.shortSummary || '', size: 22, italic: true })]
          }),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Detailed Breakdown', size: 28, bold: true, color: '1e293b' })]
          }),
          ...(summary.detailedSummary || '').split('\n\n').map(p => new docx.Paragraph({
            spacing: { after: 180 },
            children: [new docx.TextRun({ text: p, size: 22 })]
          })),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Key Takeaways', size: 28, bold: true, color: '1e293b' })]
          }),
          ...(summary.keyPoints || []).map((point, idx) => new docx.Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [new docx.TextRun({ text: `${idx + 1}. ${point}`, size: 22 })]
          })),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Action Items', size: 28, bold: true, color: '1e293b' })]
          }),
          ...(summary.actionItems || []).map((action) => new docx.Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [new docx.TextRun({ text: `[ ] ${action}`, size: 22 })]
          })),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Key Dates', size: 28, bold: true, color: '1e293b' })]
          }),
          ...(summary.importantDates || []).map((date) => new docx.Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [new docx.TextRun({ text: date, size: 22 })]
          })),

          new docx.Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new docx.TextRun({ text: 'Significant Figures', size: 28, bold: true, color: '1e293b' })]
          }),
          ...(summary.importantNumbers || []).map((number) => new docx.Paragraph({
            spacing: { after: 120 },
            bullet: { level: 0 },
            children: [new docx.TextRun({ text: number, size: 22 })]
          }))
        ]
      }]
    });

    const docxBuffer = await docx.Packer.toBuffer(docxDoc);

    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Summary_${encodeURIComponent(fileName.replace(/\.[^/.]+$/, ''))}.docx"`
      }
    });
  } catch (error) {
    console.error('Failed to export Word summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
