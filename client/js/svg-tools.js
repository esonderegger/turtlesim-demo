require('path-data-polyfill');

/**
 * Returns a set of points with a transform applied.
 * @param {Object[]} paths - An array of arrays of [X, Y] points.
 * @param {string} svgViewBox - The viewbox attribute of the SVG file.
 * @return {Object[]} - The list of paths, scaled to 10x10.
 */
function scaledPaths(paths, svgViewBox) {
  const svgWidth = parseFloat(svgViewBox.split(' ')[2]);
  const svgHeight = parseFloat(svgViewBox.split(' ')[3]);
  const longerSide = svgWidth > svgHeight ? svgWidth : svgHeight;
  const xOffset = (longerSide - svgWidth) * (5 / longerSide) + 0.5;
  const yOffset = 10.5 - (longerSide - svgHeight) * (5 / longerSide);
  return paths.map((path) => {
    return path.map((point) => {
      const scaledX = (point[0] / longerSide * 10) + xOffset;
      const scaledY = yOffset - (point[1] / longerSide * 10);
      return [scaledX, scaledY];
    });
  });
};

/**
 * Generate paths to send to a set of turtles.
 * @param {string} fileText - The text of the SVG file
 * @return {Object[]} - The list of paths, normalized to the 10x10 space.
 */
function pathsFromSvg(fileText) {
  let paths = [];
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(fileText, 'image/svg+xml');
  const svgDocElement = svgDoc.documentElement;
  const pathTags = svgDocElement.getElementsByTagName('path');
  for (let a = 0; a < pathTags.length; a++) {
    const points = pathTags[a].getPathData();
    const pathTransform = pathTags[a].getAttribute('transform');
    let absolutePoints = [];
    let originPoint = false;
    let lastPoint = false;
    for (let i = 0; i < points.length; i++) {
      if (points[i].type === 'M') {
        if (absolutePoints.length > 0) {
          paths.push(applyTransform(absolutePoints, pathTransform));
          absolutePoints = [];
        }
        absolutePoints.push(points[i].values);
        originPoint = points[i].values;
        lastPoint = points[i].values;
      }
      if (points[i].type === 'm') {
        paths.push(applyTransform(absolutePoints, pathTransform));
        absolutePoints = [];
        const newX = lastPoint[0] + points[i].values[0];
        const newY = lastPoint[1] + points[i].values[1];
        absolutePoints.push([newX, newY]);
        originPoint = [newX, newY];
        lastPoint = [newX, newY];
      }
      if (points[i].type === 'L') {
        absolutePoints.push(points[i].values);
        lastPoint = points[i].values;
      }
      if (points[i].type === 'l') {
        const newX = lastPoint[0] + points[i].values[0];
        const newY = lastPoint[1] + points[i].values[1];
        absolutePoints.push([newX, newY]);
        lastPoint = [newX, newY];
      }
      if (points[i].type === 'H') {
        const newX = points[i].values[0];
        const newY = lastPoint[1];
        absolutePoints.push([newX, newY]);
        lastPoint = [newX, newY];
      }
      if (points[i].type === 'h') {
        const newX = lastPoint[0] + points[i].values[0];
        const newY = lastPoint[1];
        absolutePoints.push([newX, newY]);
        lastPoint = [newX, newY];
      }
      if (points[i].type === 'V') {
        const newX = lastPoint[0];
        const newY = points[i].values[0];
        absolutePoints.push([newX, newY]);
        lastPoint = [newX, newY];
      }
      if (points[i].type === 'v') {
        const newX = lastPoint[0];
        const newY = lastPoint[1] + points[i].values[0];
        absolutePoints.push([newX, newY]);
        lastPoint = [newX, newY];
      }
      if (points[i].type.toUpperCase() === 'Z') {
        absolutePoints.push(originPoint);
      }
    }
    paths.push(applyTransform(absolutePoints, pathTransform));
  }
  return scaledPaths(paths, svgDocElement.getAttribute('viewBox'));
}

/**
 * Returns a set of points with a transform applied.
 * @param {Object[]} points - An array of [X, Y] points.
 * @param {string} transform - The transform attribute of the SVG path.
 * @return {Object[]} - The list of paths, transformed.
 */
function applyTransform(points, transform) {
  if (!transform) {
    return points;
  }
  if (transform.startsWith('translate')) {
    const translateNumbers = transform.slice(10, -1);
    const delimiter = translateNumbers.indexOf(',') > -1 ? ',' : ' ';
    const amounts = translateNumbers.split(delimiter);
    const translateX = parseFloat(amounts[0]);
    const translateY = amounts.length > 1 ? parseFloat(amounts[1]) : 0.0;
    return points.map((point) => {
      return [point[0] + translateX, point[1] + translateY];
    });
  }
}

module.exports = {
  scaledPaths: scaledPaths,
  pathsFromSvg: pathsFromSvg,
  applyTransform: applyTransform,
};
