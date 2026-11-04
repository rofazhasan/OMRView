import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface RenderedPdfPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface PdfRenderOptions {
  dpi?: number;
  oddPagesOnly?: boolean;
  pages?: number[];
}

export async function renderPdfToCanvases(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  options: PdfRenderOptions = {}
): Promise<RenderedPdfPage[]> {
  const dpi = options.dpi || 150;
  const scale = dpi / 72.0;

  let data: ArrayBuffer | Uint8Array;
  if (fileOrBuffer instanceof File) {
    data = await fileOrBuffer.arrayBuffer();
  } else {
    data = fileOrBuffer;
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  let targetPages: number[] = [];
  if (options.pages && options.pages.length > 0) {
    targetPages = options.pages.filter(p => p >= 1 && p <= totalPages);
  } else if (options.oddPagesOnly) {
    for (let p = 1; p <= totalPages; p += 2) {
      targetPages.push(p);
    }
  } else {
    for (let p = 1; p <= totalPages; p++) {
      targetPages.push(p);
    }
  }

  const results: RenderedPdfPage[] = [];

  for (const pageNum of targetPages) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(`Failed to acquire 2D context for PDF page ${pageNum}`);
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    results.push({
      pageNumber: pageNum,
      canvas,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}
