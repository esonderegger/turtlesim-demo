import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';
const L = require('leaflet');
L.Icon.Default.imagePath = '../../node_modules/leaflet/dist/images/';
require('leaflet-rotatedmarker');
const svgTools = require('./svg-tools.js');
const starPaths = require('./star-paths.json');
import './main.html';

const MongoTurtles = new Mongo.Collection('turtles');
const MongoPaths = new Mongo.Collection('paths');

const numberOfTurtles = 10;
let turtles = [];

Template.buttons.events({
  'click #draw-star-1-turtle' : () => {
    MongoPaths.insert({
      paths: svgTools.scaledPaths(starPaths.oneTurtleStar, '0 0 8 8')
    });
  },
  'click #draw-star-2-turtles' : () => {
    MongoPaths.insert({
      paths: svgTools.scaledPaths(starPaths.twoTurtlesStar, '0 0 8 8')
    });
  },
  'change #fileinput' : (evt) => {
    handleFileInputChange(evt);
  },
});

Template.map.rendered = () => {
  const leafletMap = L.map('turtlemap', {attributionControl: false});
  leafletMap.setView([5.5, 5.5], 6);
  const mapEdge = L.polygon([
    [0, 0],
    [11.09, 0],
    [11.09, 11.09],
    [0, 11.09],
  ], {
    color: '#666',
    fillColor: '#ffff',
    fillOpacity: 0.1,
  });
  mapEdge.addTo(leafletMap);
  const mongoQuery = MongoTurtles.find({});
  const leafletTurtles = {};
  const initLeafletTurtle = (mongoId, pose) => {
    let newTurtle = {};
    newTurtle.path = L.polyline(
      [],
      {
        color: '#fff',
        weight: 2,
      }
    );
    newTurtle.path.addTo(leafletMap);
    const turtleIcon = L.icon({
      iconUrl: 'img/sea-turtle.png',
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });
    newTurtle.marker = L.marker(
      [pose.y, pose.x],
      {
        icon: turtleIcon,
        rotationAngle: 90,
        opacity: 1,
      }
    );
    newTurtle.marker.addTo(leafletMap);
    leafletTurtles[mongoId] = newTurtle;
  }
  mongoQuery.forEach((mongoTurtle) => {
    initLeafletTurtle(mongoTurtle._id, mongoTurtle.pose);
  });
  mongoQuery.observeChanges({
    added: (id, fields) => {
      initLeafletTurtle(id, fields.pose);
    },
    changed: (id, fields) => {
      const msg = fields.pose;
      if (!leafletTurtles[id]) {
        initLeafletTurtle(id, fields.pose);
      }
      leafletTurtles[id].marker.setLatLng({lat: msg.y, lng: msg.x});
      const newAngle = (msg.theta * -180 / Math.PI) + 90;
      leafletTurtles[id].marker.setRotationAngle(newAngle);
      const latLngs = leafletTurtles[id].path.getLatLngs();
      if (leafletTurtles[id].path.isEmpty() ||
        latLngs[latLngs.length - 1].lat !== msg.y ||
        latLngs[latLngs.length - 1].lng !== msg.x
      ) {
        leafletTurtles[id].path.addLatLng({lat: msg.y, lng: msg.x});
      }
      leafletTurtles[id].lastMessage = new Date();
    },
    removed: (id) => {
      console.log('removed: ' + id);
      leafletMap.removeLayer(leafletTurtles[id].marker);
      leafletMap.removeLayer(leafletTurtles[id].path);
    }
  });
  // initTurtles(mymap);
  // setInterval(() => {
  //   checkTurtlesForRecency();
  // }, 100);
};

// const oneTurtleButton = document.getElementById('draw-star-1-turtle');
// oneTurtleButton.addEventListener('click', () => {
//   socket.emit('draw paths', svgTools.scaledPaths(starpaths, '0 0 8 8'));
// }, false);
//
// const twoTurtlesButton = document.getElementById('draw-star-2-turtles');
// twoTurtlesButton.addEventListener('click', () => {
//   socket.emit('draw paths', svgTools.scaledPaths(starpaths, '0 0 8 8'));
// }, false);
//
// const inputElement = document.getElementById('fileinput');
// inputElement.addEventListener('change', handleFileInputChange, false);

/**
 * Initializes a list of turtles on the Leaflet map.
 * @param {Object} leafletMap - the map object.
 */
function initTurtles(leafletMap) {
  for (let i = 1; i < numberOfTurtles + 1; i++) {
    let newTurtle = {};
    newTurtle.path = L.polyline(
      [],
      {
        color: '#fff',
        weight: 2,
      }
    );
    newTurtle.path.addTo(leafletMap);
    const turtleIcon = L.icon({
      iconUrl: 'img/sea-turtle.png',
      iconSize: [60, 60],
      iconAnchor: [30, 30],
    });
    newTurtle.marker = L.marker(
      [5.5, 5.5],
      {
        icon: turtleIcon,
        rotationAngle: 90,
        opacity: 0,
      }
    );
    newTurtle.marker.addTo(leafletMap);
    newTurtle.lastMessage = new Date(0);
    // socket.on('turtle' + i, function(msg) {
    //   newTurtle.marker.setLatLng({lat: msg.y, lng: msg.x});
    //   const newAngle = (msg.theta * -180 / Math.PI) + 90;
    //   newTurtle.marker.setRotationAngle(newAngle);
    //   const latLngs = newTurtle.path.getLatLngs();
    //   if (newTurtle.path.isEmpty() ||
    //     latLngs[latLngs.length - 1].lat !== msg.y ||
    //     latLngs[latLngs.length - 1].lng !== msg.x
    //   ) {
    //     newTurtle.path.addLatLng({lat: msg.y, lng: msg.x});
    //   }
    //   newTurtle.lastMessage = new Date();
    // });
    turtles.push(newTurtle);
  }
};

/**
 * Checks the last message timestamp for every turtle.
 * If they are are less that a second old, show the marker, otherwise hide.
 */
function checkTurtlesForRecency() {
  const now = new Date();
  for (let i = 0; i < numberOfTurtles; i++) {
    if (now - turtles[i].lastMessage < 1000) {
      turtles[i].marker.setOpacity(1.0);
    } else {
      turtles[i].marker.setOpacity(0);
    }
  }
};

/**
 * Clears the path data for all of the turtles on the map.
 */
function clearAllPaths() {
  for (let i = 0; i < numberOfTurtles; i++) {
    turtles[i].path.setLatLngs([]);
  }
};

/**
 * Reads the selected file as text, sends it to svgTools for paths,
 * then emits a socket message to draw the shape.
 * @param {Object} evt - the event from the file input field.
 */
function handleFileInputChange(evt) {
  const fileList = evt.target.files;
  if (fileList.length === 1) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const pathsFromSvg = svgTools.pathsFromSvg(reader.result);
      MongoPaths.insert({
        paths: pathsFromSvg
      });
    };
    reader.readAsText(fileList[0]);
  }
}
