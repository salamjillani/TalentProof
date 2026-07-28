import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mammoth from 'mammoth';
import { extractImagesFromPdf } from 'pdf-extract-image';
import Tesseract from 'tesseract.js';

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

/**
 * Perform OCR on a PDF file by converting pages to images and running Tesseract
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text
 */
export async function runPdfOcr(pdfPath) {
  console.log(`Starting OCR process for: ${pdfPath}`);
  try {
    const outputImages = await extractImagesFromPdf(pdfPath);
    
    console.log(`PDF extracted ${outputImages.length} images for OCR processing`);
    let fullText = '';
    
    for (let i = 0; i < outputImages.length; i++) {
      console.log(`Performing OCR on image ${i + 1}/${outputImages.length}...`);
      const { data: { text } } = await Tesseract.recognize(
        outputImages[i],
        'eng'
      );
      fullText += `[Page ${i + 1}]\n${text}\n\n`;
    }
    
    console.log('OCR processing completed successfully.');
    return fullText;
  } catch (error) {
    console.error('Error during OCR processing:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Extracts text and details from PDF or DOCX file
 * @param {string} filePath - Absolute path to the file
 * @param {string} originalName - Original uploaded filename
 * @returns {Promise<Object>} - { text, html (for DOCX), isOcr }
 */
export async function extractDocumentContent(filePath, originalName) {
  const extension = originalName.split('.').pop().toLowerCase();
  
  if (extension === 'pdf') {
    let text = '';
    let isOcr = false;
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const parsedData = await pdfParse(dataBuffer);
      text = parsedData.text.trim();
      
      const cleanText = text.replace(/\s+/g, '');
      if (cleanText.length < 100) {
        console.log(`Extracted PDF text is too short (${cleanText.length} chars). Triggering OCR...`);
        text = await runPdfOcr(filePath);
        isOcr = true;
      }
    } catch (parseError) {
      console.warn(`Standard PDF parsing failed (${parseError.message || parseError}). Falling back to OCR extraction...`);
      try {
        text = await runPdfOcr(filePath);
        isOcr = true;
      } catch (ocrError) {
        throw new Error(`Both standard PDF parsing and OCR extraction failed. Standard error: ${parseError.message}. OCR error: ${ocrError.message}`);
      }
    }
    
    return {
      text,
      html: null,
      isOcr
    };
  } else if (extension === 'docx') {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Mammoth extract HTML for reader view and raw text for AI model
    const htmlResult = await mammoth.convertToHtml({ buffer: dataBuffer });
    const textResult = await mammoth.extractRawText({ buffer: dataBuffer });
    
    return {
      text: textResult.value,
      html: htmlResult.value,
      isOcr: false
    };
  } else if (['png', 'jpg', 'jpeg'].includes(extension)) {
    console.log(`Direct image OCR triggered for: ${filePath}`);
    try {
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
      return {
        text,
        html: null,
        isOcr: true
      };
    } catch (ocrErr) {
      console.error('Direct image OCR failed:', ocrErr);
      throw new Error(`OCR processing failed on image file: ${ocrErr.message}`);
    }
  } else {
    throw new Error('Unsupported file format. Please upload PDF, DOCX, PNG, JPG, or JPEG.');
  }
}
