const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rosnodejs = require('rosnodejs');
const SimulatedTurtle = require('./simulated-turtle.js');

let turtle1 = null;

rosnodejs.initNode('/my_node', {onTheFly: true}).then((rosNode) => {
  turtle1 = new SimulatedTurtle(rosNode, 0, 0, 0);
  // rosNode.subscribe(
  //   '/turtle1/pose',
  //   'turtlesim/Pose',
  //   (data) => {
  //     io.emit('turtle1', data);
  //   },
  //   {
  //     queueSize: 1,
  //     throttleMs: 10,
  //   }
  // );
  turtle1.on('pose', (msg) => {
    io.emit('turtle1', msg);
  });
});

app.use(express.static('client/public'));

io.on('connection', function(socket) {
  socket.on('drawstar', function() {
    const starpath = [
      [4, 0],
      [3, 3],
      [0, 3],
      [2.5, 5],
      [1.5, 8],
      [4, 6],
      [6.5, 8],
      [5.5, 5],
      [8, 3],
      [5, 3],
      [4, 0],
    ];
    const scaledPath = starpath.map((point) => {
      return [(point[0] / 8 * 10) + 0.5, 10.5 - (point[1] / 8 * 10)];
    });
    turtle1.drawPath(scaledPath, () => {
      console.log('all done!');
      io.emit('pathmessage', 'star complete');
    });
  });
});

http.listen(3000, function() {
  console.log('listening on *:3000');
});
