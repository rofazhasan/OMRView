import * as fs from 'fs';

// Fake DOM element for canvas
import pkg from 'canvas';
const { Canvas, Image } = pkg;

// Fake DOM
(global as any).document = {
  createElement: () => new Canvas(1, 1)
};
(global as any).HTMLCanvasElement = Canvas;
(global as any).HTMLImageElement = Image;

import cv from '@techstark/opencv-js';

async function testAlign() {
  const data = JSON.parse(fs.readFileSync('/Users/md.rofazhasanrafiu/coding/OMRChecker/samples/sample6/template.json', 'utf8'));
  
  // Load image using canvas
  const imgData = fs.readFileSync('/Users/md.rofazhasanrafiu/coding/OMRChecker/samples/sample6/doc-scans/sample_roll_01.jpg');
  const img = new Image();
  img.src = imgData;
  const canvas = new Canvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  let src = cv.matFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
  
  // ALIGN LOGIC
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
          maxContour = approx.clone();
        }
      }
      approx.delete();
    }
  }

  if (maxContour) {
    console.log("Contour found! Area:", maxArea);
  } else {
    console.log("No 4-point contour found");
  }
}

testAlign();
