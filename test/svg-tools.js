const expect = require('chai').expect;
const svgTools = require('../client/svg-tools.js');

describe('Path scaling', () => {
  it('scales a square box to 10x10', () => {
    const path1 = svgTools.scaledPaths([[[1, 1], [3, 3]]], '0 0 5 5');
    expect(path1).to.deep.equal([[[2.5, 8.5], [6.5, 4.5]]]);
  });
});

describe('Path translations', () => {
  it('translates a set of paths in x and y', () => {
    const path1 = svgTools.applyTransform([[1, 1], [3, 3]], 'translate(1 1)');
    expect(path1).to.deep.equal([[2, 2], [4, 4]]);
  });
});
