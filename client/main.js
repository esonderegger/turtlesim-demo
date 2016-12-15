import {Template} from 'meteor/templating';
const L = require('leaflet');
L.Icon.Default.imagePath = '../../node_modules/leaflet/dist/images/';
require('leaflet-rotatedmarker');
const svgTools = require('./svg-tools.js');
const starPaths = require('./star-paths.json');
import './main.html';

const MongoTurtles = new Mongo.Collection('turtles');
const MongoPaths = new Mongo.Collection('paths');

Template.buttons.events({
  'click #draw-star-1-turtle': () => {
    MongoPaths.insert({
      paths: svgTools.scaledPaths(starPaths.oneTurtleStar, '0 0 8 8'),
    });
  },
  'click #draw-star-2-turtles': () => {
    MongoPaths.insert({
      paths: svgTools.scaledPaths(starPaths.twoTurtlesStar, '0 0 8 8'),
    });
  },
  'change #fileinput': (evt) => {
    const fileList = evt.target.files;
    if (fileList.length === 1) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const pathsFromSvg = svgTools.pathsFromSvg(reader.result);
        MongoPaths.insert({paths: pathsFromSvg});
      };
      reader.readAsText(fileList[0]);
    }
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
  };
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
      leafletMap.removeLayer(leafletTurtles[id].marker);
      leafletMap.removeLayer(leafletTurtles[id].path);
    },
  });
};
