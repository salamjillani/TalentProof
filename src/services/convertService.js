import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pathToFileURL } from 'url';
import libreoffice from 'libreoffice-convert';
import mammoth from 'mammoth';
import PDFDocument from 'pdfkit';
import * as docx from 'docx';

function getWorkerUrl() {
  let workerPath = path.join(process.cwd(), 'node_modules', 'pdf-parse', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  if (!fs.existsSync(workerPath)) {
    workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  }
  return pathToFileURL(workerPath).href;
}

async function pdfParse(buffer) {
  if (typeof global !== 'undefined' && !global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
      constructor() {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      }
    };
  }
  const { PDFParse } = await import('pdf-parse');
  try {
    PDFParse.setWorker(getWorkerUrl());
  } catch (err) {
    console.warn('Failed to set worker URL:', err.message);
  }
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text
  };
}

const convertAsync = promisify(libreoffice.convert);

/**
 * Fallback converter for DOCX to PDF using Mammoth (to extract text) and PDFKit (to build PDF)
 * @param {Buffer} docxBuffer 
 * @returns {Promise<Buffer>}
 */
export async function fallbackDocxToPdf(docxBuffer) {
  console.log('Running pure-JS fallback for DOCX-to-PDF...');
  const textResult = await mammoth.extractRawText({ buffer: docxBuffer });
  const text = textResult.value;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));
      
      // Document title/header
      doc.font('Helvetica-Bold').fontSize(18).text('Converted Document (Fallback Mode)', { align: 'center' });
      doc.moveDown(1.5);
      
      // Split content into lines and render them
      doc.font('Helvetica').fontSize(11).lineGap(4);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') {
          doc.moveDown(0.5);
        } else {
          // If text flows off page, PDFKit handles adding pages automatically
          doc.text(line.trim());
        }
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fallback converter for PDF to DOCX using pdf-parse (to extract text) and docx (to build Word file)
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<Buffer>}
 */
export async function fallbackPdfToDocx(pdfBuffer) {
  console.log('Running pure-JS fallback for PDF-to-DOCX...');
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;
  
  // Reconstruct wrapped lines into flowing paragraphs
  const rawLines = text.split('\n');
  const paragraphs = [];
  let currentParagraph = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === '') {
      if (currentParagraph !== '') {
        paragraphs.push(currentParagraph);
        currentParagraph = '';
      }
      continue;
    }

    if (currentParagraph === '') {
      currentParagraph = line;
    } else {
      const lastChar = currentParagraph.slice(-1);
      // Join if the line starts with lowercase, or the previous sentence didn't end with standard punctuation
      const isContinuation = !/[.!?:]/.test(lastChar) || /^[a-z]/.test(line);

      if (isContinuation) {
        currentParagraph += ' ' + line;
      } else {
        paragraphs.push(currentParagraph);
        currentParagraph = line;
      }
    }
  }
  if (currentParagraph !== '') {
    paragraphs.push(currentParagraph);
  }

  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: paragraphs.map(pText => {
        const isHeader = pText.length < 80 && !pText.endsWith('.') && 
          (pText.toUpperCase() === pText || pText.split(' ').every(word => word[0] === word[0]?.toUpperCase()));

        return new docx.Paragraph({
          spacing: { before: isHeader ? 240 : 0, after: 120 },
          children: [
            new docx.TextRun({
              text: pText,
              size: isHeader ? 28 : 22,
              bold: isHeader,
              color: isHeader ? '4f46e5' : '1f2937' // Indigo accent for headings
            })
          ]
        });
      })
    }]
  });
  
  return await docx.Packer.toBuffer(doc);
}

/**
 * Converts DOCX to PDF
 * @param {Buffer} docxBuffer 
 * @returns {Promise<Buffer>}
 */
export async function convertDocxToPdf(docxBuffer) {
  // Check if LibreOffice is installed/configured
  if (process.env.SOFFICE_PATH) {
    // Inject environmental variable for libreoffice-convert
    process.env.SOFFICE_PATH = path.normalize(process.env.SOFFICE_PATH);
  }
  
  try {
    console.log('Attempting DOCX to PDF conversion using LibreOffice...');
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    console.log('LibreOffice conversion successful.');
    return pdfBuffer;
  } catch (error) {
    console.warn('LibreOffice conversion failed or not installed. Falling back to pure JS rendering.', error.message);
    return await fallbackDocxToPdf(docxBuffer);
  }
}

/**
 * Converts PDF to DOCX
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<Buffer>}
 */
export async function convertPdfToDocx(pdfBuffer) {
  if (process.env.SOFFICE_PATH) {
    process.env.SOFFICE_PATH = path.normalize(process.env.SOFFICE_PATH);
  }
  
  try {
    console.log('Attempting PDF to DOCX conversion using LibreOffice...');
    const docxBuffer = await convertAsync(pdfBuffer, '.docx', undefined);
    console.log('LibreOffice conversion successful.');
    return docxBuffer;
  } catch (error) {
    console.warn('LibreOffice conversion failed or not installed. Falling back to pure JS rendering.', error.message);
    return await fallbackPdfToDocx(pdfBuffer);
  }
}
