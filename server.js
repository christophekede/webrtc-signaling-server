const HTTP_PORT = process.env.PORT || 3000;

const express = require('express');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

// ----------------------------------------------------------------------------------------

const server = express()
  .use(express.static('./'))
  .listen(HTTP_PORT, () => console.log(`Listening on ${HTTP_PORT}`));

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server });

var serverAddress = document.getElementById("serverAddress");
serverAddress.innerHTML = wss.url;

wss.on('connection', function(ws) {
  if (wss.clients.size > 2) {
    // we support at most 2 clients at a time right now.
    ws.close(1002,"Closing connection, can handle at most 2 connections at a time.");
  }
  ws.on('message', function(message) {
    // Broadcast any received message to all clients
    console.log('received: %s', message);
    wss.broadcast(message);
  });
  ws.on('error',function(e){});
});

wss.broadcast = function(data) {
  this.clients.forEach(function(client) {
    if(client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

console.log('Server running. Visit http://localhost:' + HTTP_PORT + ' in Firefox/Chrome.\n\n\
Some important notes:\n\
  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.\n'
);
