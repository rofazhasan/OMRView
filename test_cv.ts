import cv from '@techstark/opencv-js';
cv.onRuntimeInitialized = () => {
  console.log("CV is ready!");
  let mat = new cv.Mat();
  console.log("Mat created:", mat.rows, mat.cols);
};
