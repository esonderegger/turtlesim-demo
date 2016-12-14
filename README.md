# turtlesim-demo
A simple little demo to show a simulated turtle drawing shapes.

## How to build and run locally:

This demo requires ROS "kinetic" and Node.js be installed on Ubuntu 16.04 computer. It may work on other versions of Node.js, but it has only been tested on v6.9.2.

- [ROS "Kinetic" installation instructions](http://wiki.ros.org/kinetic/Installation/Ubuntu)
- [Node.js and NPM installation instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions)

In one tab of the terminal application, start ROS's core functionality:

    roscore

Next, in another tab of the terminal application, start the turtlesim node:

    rosmake turtlesim
    rosrun turtlesim turtlesim_node

Then, to build and run this demo:

    git clone https://github.com/esonderegger/turtlesim-demo.git
    cd turtlesim-demo
    npm install
    npm run dev

Finally, open up a web browser and go to [http://localhost:3000](http://localhost:3000) to see the simulated turtle in a Leaflet interactive map. Click the buttons to command the turtle to draw a star or upload one of the SVG files in this repository to have the turtle draw its path.

## Limitations

This turtlesim controller can only move in straight lines.

As a result of this limitation, SVG files with path elements containing Bezier curves and arcs are not supported and will produce incorrect paths.

Translation transformations of path elements are supported but all other transformations are not.
