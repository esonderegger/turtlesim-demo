const L = require('leaflet');
L.Icon.Default.imagePath = '../../node_modules/leaflet/dist/images/';
require('leaflet-rotatedmarker');
const io = require('socket.io-client');
const socket = io();

const mymap = L.map('turtlemap', {attributionControl: false});
mymap.setView([5.5, 5.5], 6);
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
mapEdge.addTo(mymap);

let turtlePath = L.polyline(
  [],
  {
    color: '#fff',
    eight: 2,
  }
);
turtlePath.addTo(mymap);
const turtleIcon = L.icon({
  iconUrl: 'img/sea-turtle.png',
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});
let turtleMarker = L.marker(
  [5.5, 5.5],
  {
    icon: turtleIcon,
    rotationAngle: 45,
  }
);
turtleMarker.addTo(mymap);

socket.on('turtle1', function(msg) {
  turtleMarker.setLatLng({lat: msg.y, lng: msg.x});
  const newAngle = (msg.theta * -180 / Math.PI) + 90;
  turtleMarker.setRotationAngle(newAngle);
  turtlePath.addLatLng({lat: msg.y, lng: msg.x});
});

const starbutton = document.getElementById('starbutton');
starbutton.addEventListener('click', () => {
  socket.emit('drawstar', 'go');
}, false);
