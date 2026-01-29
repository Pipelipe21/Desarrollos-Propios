import * as pdfjsLib from 'pdfjs-dist';
import { db } from '../db/db';
import { Manual, ManualSegment } from '../types';

// PDF.js worker setup
// Handle potential ESM/CJS interop issues where default export contains the lib
const pdf: any = (pdfjsLib as any).default || pdfjsLib;

// Explicitly check and set worker
if (pdf.GlobalWorkerOptions) {
  pdf.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs`;
} else {
  console.warn("PDF.js GlobalWorkerOptions not found, PDF processing might fail.");
}

export interface SearchResult {
  segment: ManualSegment;
  manualTitle: string;
  score: number;
}

/**
 * Reads a File object and extracts text from each page.
 * Returns metadata and an array of text segments.
 */
export const processPDF = async (file: File, machineId?: number, onProgress?: (pct: number) => void): Promise<void> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF
  const loadingTask = pdf.getDocument(arrayBuffer);
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;

  // 1. Create Manual Entry
  const manualId = await db.manuals.add({
    title: file.name.replace('.pdf', ''),
    fileName: file.name,
    fileData: file, // Store Blob for download later
    uploadDate: Date.now(),
    pageCount: pageCount,
    machineId: machineId
  });

  // 2. Extract Text Pages
  const segments: ManualSegment[] = [];
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    
    // Clean text: remove excessive whitespace
    const cleanText = pageText.replace(/\s+/g, ' ').trim();

    if (cleanText.length > 0) {
      segments.push({
        manualId: manualId as number,
        pageNumber: i,
        content: cleanText
      });
    }

    if (onProgress) {
      onProgress(Math.round((i / pageCount) * 100));
    }
  }

  // 3. Bulk Insert Segments
  await db.manualSegments.bulkAdd(segments);
};

/**
 * Searches local ManualSegments for keywords.
 * Returns ranked results.
 */
export const searchManualsLocally = async (query: string, machineId?: number): Promise<SearchResult[]> => {
  const keywords = query.toLowerCase().split(' ').filter(k => k.length > 3); // Ignore short words
  if (keywords.length === 0) return [];

  // Get relevant manuals first to filter segments
  let relevantManualIds: number[] = [];
  if (machineId) {
    const manuals = await db.manuals.where('machineId').equals(machineId).toArray();
    relevantManualIds = manuals.map(m => m.id!);
  }

  // Scan Segments (Note: For large DBs, a proper Full Text Search index like FlexSearch is better.
  // For Dexie/IndexedDB with < 50 manuals, a linear scan or filtered scan is acceptable).
  const allSegments = await db.manualSegments.toArray(); // Optimization: filter by manualId if machineId provided
  
  const results: SearchResult[] = [];

  for (const seg of allSegments) {
    // Filter by machine if requested
    if (machineId && !relevantManualIds.includes(seg.manualId)) continue;

    const contentLower = seg.content.toLowerCase();
    let score = 0;

    keywords.forEach(word => {
      // Basic frequency counting
      const regex = new RegExp(word, 'g');
      const count = (contentLower.match(regex) || []).length;
      score += count;
    });

    if (score > 0) {
      const manual = await db.manuals.get(seg.manualId);
      if (manual) {
        results.push({
          segment: seg,
          manualTitle: manual.title,
          score: score
        });
      }
    }
  }

  // Sort by score desc
  return results.sort((a, b) => b.score - a.score).slice(0, 5); // Return top 5
};
