'use strict';
const EventEmitter = require('events');
const rosnodejs = require('rosnodejs');

/** Class representing a turtlesim turtle. */
class SimulatedTurtle extends EventEmitter {
  /**
   * Create a new turtle.
   * @param {rosNode} rosNode - ROS Node from rosnodejs.
   * @param {number} x - Initial x coordinate for the new turtle.
   * @param {number} y - Initial y coordinate for the new turtle.
   * @param {number} theta - Initial theta value for the new turtle.
   * @param {string} name - The name for the turtle. Must be unique.
   */
  constructor(rosNode, x, y, theta, name) {
    super();
    this.rosNode = rosNode;
    this.xPosition = x;
    this.yPosition = y;
    this.theta = theta;
    this.name = name;
    this.angularVelocity = 0.0;
    this.linearVelocity = 0.0;
    this.publishInterval = 10;
    this.thetaTolerance = 0.00005;
    this.distanceTolerance = 0.005;
    const spawnMessage = rosnodejs.require('turtlesim').srv.Spawn;
    const spawnRequest = new spawnMessage.Request({
      x: x,
      y: y,
      theta: theta,
      name: name,
    });
    let spawnClient = rosNode.serviceClient('/spawn', 'turtlesim/Spawn');
    rosNode.waitForService(spawnClient.getService(), 2000)
      .then((available) => {
        if (available) {
          spawnClient.call(spawnRequest, (resp) => {
            console.log('spawned ' + name);
          });
        } else {
          console.log('Service not available');
        }
      });
    rosNode.subscribe(
      '/' + name + '/pose',
      'turtlesim/Pose',
      (data) => {
        this.setCurrentPose(data);
      },
      {queueSize: 1, throttleMs: this.publishInterval}
    );
    this.publisher = rosNode.advertise(
      '/' + name + '/cmd_vel',
      'geometry_msgs/Twist',
      {
        queueSize: 1,
        latching: true,
        throttleMs: this.publishInterval,
      }
    );
  }

  /**
   * Sets pose data for turtlesim object from Pose message.
   * @param {turtlesim/Pose} poseData - The message from the subscriber.
   */
  setCurrentPose(poseData) {
    this.xPosition = poseData.x;
    this.yPosition = poseData.y;
    this.theta = poseData.theta;
    this.angularVelocity = poseData.angular_velocity;
    this.linearVelocity = poseData.angular_velocity;
    this.emit('pose', poseData);
  }

  /**
   * Publishes a Twist message for the given linear and angular velocities.
   * @param {number} linVel - The new linear velocity.
   * @param {number} angVel - The new angular velocity.
   */
  setVelocity(linVel, angVel) {
    const Twist = rosnodejs.require('geometry_msgs').msg.Twist;
    const msgTwist = new Twist({
      linear: {x: linVel, y: 0, z: 0},
      angular: {x: 0, y: 0, z: angVel},
    });
    this.publisher.publish(msgTwist);
  }

  /**
   * Directs the turtle to the desired theta value using PID control.
   * @param {number} goalTheta - The desired theta value.
   * @param {requestCallback} callback - What to do after completion.
   * @param {number} previousError - The measured error of previous step.
   * @param {number} integral - The integral value from the previous step.
   */
  goToTheta(goalTheta, callback, previousError, integral) {
    let errorVal = this.thetaError(goalTheta, this.theta);
    if (Math.abs(errorVal) < this.thetaTolerance) {
      this.setVelocity(0.0, 0.0);
      callback();
    } else {
      let kp = 10.0;
      let ki = 0.0;
      let kd = 0.0;
      let maxVelocity = 3.14;
      previousError = previousError ? previousError : 0.0;
      integral = integral ? integral : 0.0;
      integral = integral + errorVal * this.publishInterval;
      let derivative = (errorVal - previousError) / this.publishInterval;
      let newVelocity = kp * errorVal + ki * integral + kd * derivative;
      if (newVelocity > maxVelocity) {
        this.setVelocity(0.0, maxVelocity);
      } else if (newVelocity < -maxVelocity) {
        this.setVelocity(0.0, -maxVelocity);
      } else {
        this.setVelocity(0.0, newVelocity);
      }
      setTimeout(() => {
        this.goToTheta(goalTheta, callback, errorVal, integral);
      }, this.publishInterval);
    }
  }

  /**
   * Returns the theta value to point the turtle toward the XY coordinates.
   * @param {number} goalX - The new linear velocity.
   * @param {number} goalY - The new angular velocity.
   * @return {number}
   */
  thetaForGoalPosition(goalX, goalY) {
    return Math.atan2(goalY - this.yPosition, goalX - this.xPosition);
  }

  /**
   * Since artangent values range from -pi to pi, sometimes the difference
   * between the desired theta and the current theta is greater than pi.
   * In those cases, we should rotate in the opposite direction.
   * @param {number} desired - The desired theta value.
   * @param {number} current - The current theta value.
   * @return {number}
   */
  static thetaError(desired, current) {
    let errorAmount = desired - current;
    if (Math.abs(errorAmount) < Math.PI) {
      return errorAmount;
    }
    while (errorAmount > Math.PI) {
      errorAmount -= (Math.PI * 2);
    }
    while (errorAmount < -Math.PI) {
      errorAmount += (Math.PI * 2);
    }
    return errorAmount;
  }

  /**
   * Directs the turtle to the desired XY coordinates using PID control.
   * @param {number} goalX - The desired x coordinate.
   * @param {number} goalY - The desired y coordinate.
   * @param {requestCallback} callback - What to do after completion.
   * @param {number} previousError - The measured error of previous step.
   * @param {number} integral - The integral value from the previous step.
   */
  goInLine(goalX, goalY, callback, previousError, integral) {
    let errorVal = Math.sqrt(Math.pow(goalX - this.xPosition, 2) +
      Math.pow(goalY - this.yPosition, 2));
    if (errorVal < this.distanceTolerance) {
      this.setVelocity(0.0, 0.0);
      callback();
    } else {
      let angVelocity = this.thetaError(
        this.thetaForGoalPosition(goalX, goalY), this.theta
      );
      if (Math.abs(angVelocity) > Math.PI / 2) { // we've gone too far.
        angVelocity = 0.0;
        errorVal = -errorVal;
      }
      let kp = 2.0;
      let ki = 0.0;
      let kd = 0.0;
      let maxVelocity = 1.5;
      previousError = previousError ? previousError : 0.0;
      integral = integral ? integral : 0.0;
      integral = integral + errorVal * this.publishInterval;
      let derivative = (errorVal - previousError) / this.publishInterval;
      let newVelocity = kp * errorVal + ki * integral + kd * derivative;
      if (newVelocity > maxVelocity) {
        this.setVelocity(maxVelocity, angVelocity);
      } else {
        this.setVelocity(newVelocity, angVelocity);
      }
      setTimeout(() => {
        this.goInLine(goalX, goalY, callback, errorVal, integral);
      }, this.publishInterval);
    }
  }

  /**
   * Moves the turtle in a linear fashion to the specified XY coordiantes.
   * @param {number} goalX - The desired x coordinate.
   * @param {number} goalY - The desired y coordinate.
   * @param {requestCallback} callback - What to do after completion.
   */
  goToCoordinates(goalX, goalY, callback) {
    this.goToTheta(this.thetaForGoalPosition(goalX, goalY), () => {
      this.goInLine(goalX, goalY, callback);
    });
  }

  /**
   * Moves the turtle along the specified path of absolute coordinates.
   * @param {array} xyArray - An array of absolute coordinates.
   * @param {requestCallback} callback - What to do after completion.
   */
  drawPath(xyArray, callback) {
    if (xyArray.length === 0) {
      callback();
    } else {
      this.goToCoordinates(
        xyArray[0][0],
        xyArray[0][1],
        () => {
          this.drawPath(xyArray.slice(1), callback);
        }
      );
    }
  }

  /**
   * Sets the turtle's pen color (r g b), width, and turns pen on or off.
   * @param {number} r - The red channel of the pen color.
   * @param {number} g - The green channel of the pen color.
   * @param {number} b - The blue channel of the pen color.
   * @param {number} width - The width of the pen.
   * @param {number} off - Whether the pen is on or off.
   * @param {requestCallback} callback - What to do after completion.
   */
  setPen(r, g, b, width, off, callback) {
    const penMessage = rosnodejs.require('turtlesim').srv.SetPen;
    const penRequest = new penMessage.Request({
      r: r,
      g: g,
      b: b,
      width: width,
      off: off,
    });
    let penClient = this.rosNode.serviceClient(
      '/' + this.name + '/set_pen',
      'turtlesim/SetPen'
    );
    this.rosNode.waitForService(penClient.getService(), 2000)
      .then((available) => {
        if (available) {
          penClient.call(penRequest, (resp) => {
            callback();
          });
        } else {
          console.log('Service not available');
        }
      });
  }

  /**
   * Teleports the turtle to (x, y, theta).
   * @param {number} x - The new x coordinate.
   * @param {number} y - The new y coordinate.
   * @param {number} theta - The new heading.
   * @param {requestCallback} callback - What to do after completion.
   */
  teleportAbsolute(x, y, theta, callback) {
    const teleMessage = rosnodejs.require('turtlesim').srv.TeleportAbsolute;
    const teleRequest = new teleMessage.Request({
      x: x,
      y: y,
      theta: theta,
    });
    let teleClient = this.rosNode.serviceClient(
      '/' + this.name + '/teleport_absolute',
      'turtlesim/TeleportAbsolute'
    );
    this.rosNode.waitForService(teleClient.getService(), 2000)
      .then((available) => {
        if (available) {
          teleClient.call(teleRequest, (resp) => {
            callback();
          });
        } else {
          console.log('Service not available');
        }
      });
  }

  /**
   * Teleports the turtle from the turtle's current position.
   * @param {number} linear - The new x coordinate.
   * @param {number} angular - The new y coordinate.
   * @param {requestCallback} callback - What to do after completion.
   */
  teleportRelative(linear, angular, callback) {
    const teleMessage = rosnodejs.require('turtlesim').srv.TeleportRelative;
    const teleRequest = new teleMessage.Request({
      linear: linear,
      angular: angular,
    });
    let teleClient = this.rosNode.serviceClient(
      '/' + this.name + '/teleport_relative',
      'turtlesim/TeleportRelative'
    );
    this.rosNode.waitForService(teleClient.getService(), 2000)
      .then((available) => {
        if (available) {
          teleClient.call(teleRequest, (resp) => {
            callback();
          });
        } else {
          console.log('Service not available');
        }
      });
  }
}

module.exports = SimulatedTurtle;
