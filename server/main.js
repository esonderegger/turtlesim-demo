import {Meteor} from 'meteor/meteor';
const rosnodejs = require('rosnodejs');
const SimulatedTurtle = require('./simulated-turtle.js');

const MongoTurtles = new Mongo.Collection('turtles');
const MongoPaths = new Mongo.Collection('paths');

Meteor.startup(() => {
  let turtles = [];
  let killTurtle = null;
  let drawPaths = null;
  let turtleCounter = 2;
  MongoTurtles.remove({});
  MongoPaths.remove({});
  const pathsQuery = MongoPaths.find({});
  pathsQuery.observeChanges({
    added: (id, fields) => {
      drawPaths(fields.paths, () => {
      });
    },
  });
  const updateMongoTurtle = Meteor.bindEnvironment((id, msg) => {
    MongoTurtles.update(id, {$set: {pose: msg}});
  });
  rosnodejs.initNode('/my_node', {onTheFly: true}).then((rosNode) => {
    killTurtle = (turtleName, callback) => {
      const killMessage = rosnodejs.require('turtlesim').srv.Kill;
      const killRequest = new killMessage.Request({name: turtleName});
      let killClient = rosNode.serviceClient('/kill', 'turtlesim/Kill');
      rosNode.waitForService(killClient.getService(), 2000)
        .then((available) => {
          if (available) {
            killClient.call(killRequest, (resp) => {
              callback();
            });
          } else {
            console.log('Service not available');
          }
        });
    };
    drawPaths = (paths, callback) => {
      for (let a = 0; a < turtles.length; a++) {
        killTurtle(turtles[a].name);
        turtles[a].exists = false;
        delete turtles[a].turtle;
      }
      turtles = [];
      MongoTurtles.remove({});
      for (let b = 0; b < paths.length; b++) {
        turtleCounter += 1;
        let newTurtleName = 'turtle' + turtleCounter;
        let newTurtle = new SimulatedTurtle(
          rosNode,
          paths[b][0][0],
          paths[b][0][1],
          0,
          newTurtleName
        );
        let newTurtleObj = {
          name: newTurtleName,
          turtle: newTurtle,
          exists: true,
        };
        let newMongoTurtle = MongoTurtles.insert({
          name: newTurtleName,
          pose: {
            x: paths[b][0][0],
            y: paths[b][0][1],
            theta: 0,
            angular_velocity: 0,
            linear_velocity: 0,
          },
        });
        newTurtle.on('pose', (msg) => {
          if (newTurtleObj.exists) {
            updateMongoTurtle(newMongoTurtle, msg);
          }
        });
        newTurtle.drawPath(paths[b], () => {
        });
        turtles.push(newTurtle);
      }
    };
    killTurtle('turtle1', () => {});
    let originalTurtle = {
      name: 'turtle2',
      turtle: new SimulatedTurtle(rosNode, 5.5, 5.5, 0, 'turtle2'),
      exists: true,
    };
    let originalMongoTurtle = MongoTurtles.insert({
      name: originalTurtle.name,
      x: 5.5,
      y: 5.5,
      theta: 0,
      angular_velocity: 0,
      linear_velocity: 0,
    });
    originalTurtle.turtle.on('pose', (msg) => {
      if (originalTurtle.exists) {
        updateMongoTurtle(originalMongoTurtle, msg);
      }
    });
    turtles.push(originalTurtle);
  });
});
