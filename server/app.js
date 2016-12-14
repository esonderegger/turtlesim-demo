const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rosnodejs = require('rosnodejs');
const SimulatedTurtle = require('./simulated-turtle.js');

let turtles = [];
let killTurtle = null;
let drawPaths = null;

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
    setTimeout(() => {
      io.emit('clear all paths', 'now');
    }, 100);
    for (let b = 0; b < paths.length; b++) {
      let newTurtleName = 'turtle' + (b + 1);
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
      newTurtle.on('pose', (msg) => {
        if (newTurtleObj.exists) {
          io.emit(newTurtleName, msg);
        }
      });
      newTurtle.drawPath(paths[b], () => {
        console.log('path segment complete.');
      });
      turtles.push(newTurtle);
    }
  };
  killTurtle('turtle1');
  let originalTurtle = {
    name: 'turtle1',
    turtle: new SimulatedTurtle(rosNode, 5.5, 5.5, 0, 'turtle1'),
    exists: true,
  };
  originalTurtle.turtle.on('pose', (msg) => {
    if (originalTurtle.exists) {
      io.emit(originalTurtle.name, msg);
    }
  });
  turtles.push(originalTurtle);
});

app.use(express.static('client/public'));

io.on('connection', function(socket) {
  socket.on('draw paths', function(paths) {
    drawPaths(paths, () => {
      io.emit('path message', 'path complete');
    });
  });
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});
