'use strict';
const EventEmitter = require('events');
const rosnodejs = require('rosnodejs');

/** Class representing a turtlesim turtle. */
class SimulatedTurtle extends EventEmitter {
  /**
   * Create a point.
   * @param {rosNode} rosNode - ROS Node from rosnodejs.
   * @param {number} x - Initial x coordinate for the new turtle.
   * @param {number} y - Initial y coordinate for the new turtle.
   * @param {number} theta - Initial theta value for the new turtle.
   */
  constructor(rosNode, x, y, theta) {
    super();
    this.xPosition = x;
    this.yPosition = y;
    this.theta = theta;
    this.angularVelocity = 0.0;
    this.linearVelocity = 0.0;
    this.publishInterval = 10;
    this.thetaTolerance = 0.00005;
    this.distanceTolerance = 0.005;
    rosNode.subscribe(
      '/turtle1/pose',
      'turtlesim/Pose',
      (data) => {
        this.setCurrentPose(data);
      },
      {queueSize: 1, throttleMs: 0}
    );
    this.publisher = rosNode.advertise(
      '/turtle1/cmd_vel',
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
    let errorVal = goalTheta - this.theta;
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
      let kp = 2.0;
      let ki = 0.0;
      let kd = 0.0;
      let maxVelocity = 1.5;
      previousError = previousError ? previousError : 0.0;
      integral = integral ? integral : 0.0;
      integral = integral + errorVal * this.publishInterval;
      let derivative = (errorVal - previousError) / this.publishInterval;
      let newVelocity = kp * errorVal + ki * integral + kd * derivative;
      let angVelocity = this.thetaForGoalPosition(goalX, goalY) - this.theta;
      if (Math.abs(angVelocity) > Math.PI) { // we've gone too far.
        angVelocity = 0.0;
        newVelocity = -newVelocity;
      }
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
}

module.exports = SimulatedTurtle;
