import type { BubblePoint, Template } from './templateParser';

declare const cv: any;

function orderPoints(pts: any[]): any[] {
  const sum = pts.map(p => p.x + p.y);
  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];

  const diff = pts.map(p => p.y - p.x);
  const tr = pts[diff.indexOf(Math.min(...diff))];
  const bl = pts[diff.indexOf(Math.max(...diff))];

  return [tl, tr, br, bl];
}

function alignDocument(src: any, template: Template): any {
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  
  let blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  
  let edges = new cv.Mat();
  cv.Canny(blurred, edges, 75, 200);

  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxContour = null;

  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area > 10000) { 
      let peri = cv.arcLength(cnt, true);
      let approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        if (area > maxArea) {
          maxArea = area;
          if (maxContour) maxContour.delete();
          maxContour = approx;
        } else {
          approx.delete();
        }
      } else {
        approx.delete();
      }
    }
  }

  const [targetW, targetH] = template.pageDimensions;
  let warped = new cv.Mat();

  if (maxContour) {
    let pts = [];
    for (let i = 0; i < 4; i++) {
      pts.push({ x: maxContour.data32S[i * 2], y: maxContour.data32S[i * 2 + 1] });
    }
    const ordered = orderPoints(pts);
    
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      ordered[0].x, ordered[0].y,
      ordered[1].x, ordered[1].y,
      ordered[2].x, ordered[2].y,
      ordered[3].x, ordered[3].y
    ]);
    
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      targetW - 1, 0,
      targetW - 1, targetH - 1,
      0, targetH - 1
    ]);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(src, warped, M, new cv.Size(targetW, targetH));
    
    srcTri.delete(); dstTri.delete(); M.delete(); maxContour.delete();
    console.log("Applied perspective correction");
  } else {
    console.log("No 4-point contour found, falling back to resize");
    cv.resize(src, warped, new cv.Size(targetW, targetH), 0, 0, cv.INTER_AREA);
  }

  gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();
  return warped;
}

export async function processOMR(
  imageCanvas: HTMLCanvasElement, 
  template: Template, 
  bubbles: BubblePoint[], 
  overlayCanvas: HTMLCanvasElement
) {
  if (typeof cv === 'undefined') throw new Error('OpenCV not loaded');

  let src = cv.imread(imageCanvas);
  
  // 1. Perspective Correction
  let warped = alignDocument(src, template);

  // Convert warped to grayscale for intensity reading
  let gray = new cv.Mat();
  cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
  
  const [bw, bh] = template.bubbleDimensions;
  
  // 2. Extract bubble intensities
  const bubbleValues = bubbles.map(b => {
    let rect = new cv.Rect(Math.round(b.x), Math.round(b.y), Math.round(bw), Math.round(bh));
    if (rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= gray.cols && rect.y + rect.height <= gray.rows) {
      let roi = gray.roi(rect);
      let meanVal = cv.mean(roi)[0];
      roi.delete();
      return { ...b, meanVal, rect };
    }
    return null;
  }).filter(b => b !== null) as any[];

  // 3. Dynamic Threshold algorithm
  const means = bubbleValues.map(b => b.meanVal).sort((a, b) => a - b);
  let threshold = 150; 
  let maxGap = 0;
  
  if (means.length > 2) {
    for (let i = 1; i < means.length; i++) {
      const gap = means[i] - means[i - 1];
      if (gap > maxGap && gap > 10) { 
        maxGap = gap;
        threshold = means[i - 1] + gap / 2;
      }
    }
  }

  console.log("Dynamic Threshold:", threshold);

  const results: Record<string, string[]> = {};
  
  bubbleValues.forEach(b => {
    const isMarked = b.meanVal < threshold;
    
    if (isMarked) {
      if (!results[b.label]) results[b.label] = [];
      results[b.label].push(b.value);
    }

    let color = isMarked ? new cv.Scalar(0, 255, 0, 255) : new cv.Scalar(255, 0, 0, 100);
    let p1 = new cv.Point(b.rect.x, b.rect.y);
    let p2 = new cv.Point(b.rect.x + b.rect.width, b.rect.y + b.rect.height);
    cv.rectangle(warped, p1, p2, color, 3);
  });

  cv.imshow(overlayCanvas, warped);

  src.delete();
  warped.delete();
  gray.delete();

  return results;
}
