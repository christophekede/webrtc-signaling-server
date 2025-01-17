const HTTP_PORT = process.env.PORT || 3000;

const express = require('express');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;

// ----------------------------------------------------------------------------------------

const app = express();
const server = app.listen(HTTP_PORT, () => console.log(`Listening on ${HTTP_PORT}`));
app.set('view engine', 'pug');
app.set('views', './');


// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server });


app.get('/', function (req, res) {
  res.render('index', { nwebsockets: wss.clients.size });
});

wss.on('connection', function(ws) {
  // if (wss.clients.size > 2) {
  //   // we support at most 2 clients at a time right now.
  //   ws.close(1002,"Closing connection, can handle at most 2 connections at a time.");
  // }
  ws.on('message', function(message) {
    // Broadcast any received message to all clients
    console.log('received :', message, typeof message);
    wss.broadcast(message, ws);
  });
  ws.on('error',function(e){});

  ws.on("close", function() {
       return ws.terminate();
     });
});

wss.broadcast = function(data,ws) {
  this.clients.forEach(function(client) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
  });
};


const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

console.log('Server running. Visit http://localhost:' + HTTP_PORT + '.\n\n');
