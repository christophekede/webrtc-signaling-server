
// Define "global" variables

// UI variables
var connectButton = null;
var disconnectButton = null;
var sendButton = null;
var messageInputBox = null;
var receiveBox = null;

// Signalling Variables (used to communicate via server)
var uuid;
var serverConnection;

// RTC Variables!!
var peerConnection = null;  // RTCPeerConnection
var dataChannel = null;     // RTCDataChannel

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

// Functions

// Set things up, connect event listeners, etc.

function startup() {
  // Get the local UI elements ready
  connectButton = document.getElementById('connectButton');
  disconnectButton = document.getElementById('disconnectButton');
  sendButton = document.getElementById('sendButton');
  messageInputBox = document.getElementById('message');
  receiveBox = document.getElementById('receivebox');

  // Set event listeners for user interface widgets

  connectButton.addEventListener('click', startCall, false);
  disconnectButton.addEventListener('click', disconnectPeers, false);
  sendButton.addEventListener('click', sendMessageThroughDataChannel, false);

  // And set up our signalling server
  uuid = createUUID();

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;
}

function startCall() {
  console.log('start');
  start(true);
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;

  // If we're the caller, we create the Data Channel
  // Otherwise, it opens for us and we receive an event as soon as the peerConnection opens
  if (isCaller) {
    dataChannel = peerConnection.createDataChannel("testChannel");
    dataChannel.onmessage = handleDataChannelReceiveMessage;
    dataChannel.onopen = handleDataChannelStatusChange;
    dataChannel.onclose = handleDataChannelStatusChange;
  } else {
    peerConnection.ondatachannel = handleDataChannelCreated;
  }

  // Kick it off (if we're the caller)
  if (isCaller) {
    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid })))
      .catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnection.createAnswer()
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid })))
        .catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
  }
}

// Called when we are not the caller (ie we are the receiver)
// and the data channel has been opened
function handleDataChannelCreated(event) {
  console.log('DataChannel Opened');

  dataChannel = event.channel;
  dataChannel.onmessage = handleDataChannelReceiveMessage;
  dataChannel.onopen = handleDataChannelStatusChange;
  dataChannel.onclose = handleDataChannelStatusChange;
}

// Handles clicks on the "Send" button by transmitting

// a message to the remote peer.

function sendMessageThroughDataChannel() {
  var message = messageInputBox.value;
  console.log("Sending: " + message);
  dataChannel.send(message);

  // Clear the input box and re-focus it, so that we're
  // ready for the next message.

  messageInputBox.value = "";
  messageInputBox.focus();
}

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.

function handleDataChannelStatusChange(event) {
  if (dataChannel) {
    console.log("DataChannel Status: " + dataChannel.readyState);

    var state = dataChannel.readyState;

    if (state === "open") {
      messageInputBox.disabled = false;
      messageInputBox.focus();
      sendButton.disabled = false;
      disconnectButton.disabled = false;
      connectButton.disabled = true;
    } else {
      messageInputBox.disabled = true;
      sendButton.disabled = true;
      connectButton.disabled = false;
      disconnectButton.disabled = true;
    }
  }
}

// Handle onmessage events for the data channel.
// These are the data messages sent by the remote channel.

function handleDataChannelReceiveMessage(event) {
  console.log("Message: " + event.data);
  var el = document.createElement("p");
  var txtNode = document.createTextNode(event.data);

  el.appendChild(txtNode);
  receiveBox.appendChild(el);
}

// Close the connection, including data channels if they're open.
// Also update the UI to reflect the disconnected status.

function disconnectPeers() {

  // Close the RTCDataChannels if they're open.

  dataChannel.close();

  // Close the RTCPeerConnection

  peerConnection.close();

  dataChannel = null;
  peerConnection = null;

  // Update user interface elements

  connectButton.disabled = false;
  disconnectButton.disabled = true;
  sendButton.disabled = true;

  messageInputBox.value = "";
  messageInputBox.disabled = true;
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}