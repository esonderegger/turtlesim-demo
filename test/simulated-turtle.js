const expect = require('chai').expect;
const SimulatedTurtle = require('../server/simulated-turtle.js');

describe('Theta error logic', () => {
  it('handles the easy stuff', () => {
    const positiveError = SimulatedTurtle.thetaError(0.5, 0.0);
    const negativeError = SimulatedTurtle.thetaError(-0.2, 0.2);
    expect(positiveError).to.equal(0.5);
    expect(negativeError).to.equal(-0.4);
  });
  it('handles the stuff around pi and -pi', () => {
    const posError = SimulatedTurtle.thetaError(-Math.PI + 0.2, Math.PI - 0.2);
    const negError = SimulatedTurtle.thetaError(Math.PI - 0.2, -Math.PI + 0.2);
    expect(posError).to.be.within(0.399, 0.401);
    expect(negError).to.be.within(-0.401, -0.399);
  });
});
