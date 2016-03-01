// Last time updated at April 27, 2015, 08:32:23

// Muaz Khan         - www.MuazKhan.com
// MIT License       - www.WebRTC-Experiment.com/licence
// Documentation     - github.com/muaz-khan/DataChannel
// ______________
// DataChannel.js

//'use strict';
// This shows why it won't work on Android less than 5.0
// https://developer.chrome.com/multidevice/webview/overview

// ------------------------------------------------------------------------------------------------------------------------------------------------ //
// Pebble Communication
// ------------------------------------------------------------------------------------------------------------------------------------------------ //
var channelname = "unknown";
var channel, thetext, myuserid, dict;
var isFirstConnectionOpened; // was referenced everywhere as window.isFirstConnectionOpened
function logit(message) {
  console.log(message);
}

function censor(censor) {
  var i = 0;
  return function(key, value) {
    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) return '[censor-Circular]'; 
    if(i >= 29) return '[censor-Unknown]';// seems to be a harded maximum of 30 serialized objects?
    ++i; // so we know we aren't using the original object anymore
    return value;  
  };
}

function stringify(whattostringify) {
  return JSON.stringify(whattostringify, censor(whattostringify));
}

//(function() {
logit('Rob: IIFE!');

DataChannel = function(channel) {
  var self = this;
  var dataConnector;
  var textReceiver;

  if (channel) {
    self.automatic = true;
  }

  self.channel = channel || location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
  self.channels = {};


  self.onmessage = function(message, userid, latency) {
    logit("(" + latency + "ms)" + userid + ' sent message: "' + message + '"');
    send_message('KEY_MSG', userid + ": " + message);
  };

  self.onopen = function(userid) {
    logit(userid + ' is connected with you.');
    send_message('KEY_SYS', userid + " connected!");
  };

  self.onclose = function(event) {
    logit('data channel closed: ' + stringify(event));
    //send_message('KEY_ERR',"Channel Closed" + event);
  };

  self.onerror = function(event) {
    logit('data channel error: ' + event);
    send_message('KEY_ERR',"Channel Error: " + stringify(event));
  };

  function prepareInit(callback) {
    logit('Rob: prepareInit (many-to-many)'); self.direction = self.direction || 'many-to-many';
    //logit('Rob: prepareInit (one-to-one)'); self.direction = self.direction || 'one-to-one';

    if (self.userid) {
      window.userid = self.userid;
      logit('Rob: self.userid=' + self.userid);
      send_message('KEY_SYS', "You are " + self.userid);
    }

    if (!self.openSignalingChannel) {
      if (typeof self.transmitRoomOnce === 'undefined') {
        self.transmitRoomOnce = true;
      }

      // socket.io over node.js: https://github.com/muaz-khan/WebRTC-Experiment/blob/master/Signaling.md
      self.openSignalingChannel = function(config) {
        logit('DataChannel.openSignalingChannel: ' + stringify(config));
        config = config || {};

        channel = config.channel || self.channel || 'default-channel';
        var socket = new window.Firebase('https://' + (self.firebase || 'webrtc-experiment') + '.firebaseIO.com/' + channel);
        socket.channel = channel;

        socket.on('child_added', function(data) {
          config.onmessage(data.val());
        });

        socket.send = function(data) {
          this.push(data);
        };

        if (!self.socket) {
          self.socket = socket;
        }

        if (channel !== self.channel || (self.isInitiator && channel === self.channel)) {
          socket.onDisconnect().remove();
        }

        if (config.onopen) {
          setTimeout(config.onopen, 1);
        }

        return socket;
      };  // END openSignalingChannel

      if (!window.Firebase) {
        //logit('======== FIREBASE =======');
        var script = document.createElement('script');
        script.src = 'https://cdn.webrtc-experiment.com/firebase.js';
        script.onload = callback;
        document.documentElement.appendChild(script);
        //callback();
      } else {
        callback();
      }
    } else {
      callback();
    }
  }

  // creates config
  function init() {
    if (self.config) {
      return;
    }

    self.config = {
      ondatachannel: function(room) {
        logit('ondatachannel: room ' + stringify(room));
        if (!dataConnector) {
          self.room = room;
          return;
        }

        var tempRoom = {
          id: room.roomToken,
          owner: room.broadcaster
        };

        if (self.ondatachannel) {
          return self.ondatachannel(tempRoom);
        }

        if (self.joinedARoom) {
          return;
        }

        self.joinedARoom = true;
        self.joindaroom(tempRoom);
      },
      onopen: function(userid, _channel) {
        logit('onopen: user ' + userid + " - channel: " + stringify(_channel));
        self.onopen(userid, _channel);
        self.channels[userid] = {
          channel: _channel,
          send: function(data) {
            self.send(data, this.channel);
          }
        };
      },
      onmessage: function(data, userid) {
        logit('onmessage: user ' + userid + " - data: " + stringify(data));
        if (!data.size) {data = JSON.parse(data);}
        if (data.type === 'text') {
          textReceiver.receive(data, self.onmessage, userid);
          //} else if (typeof data.maxChunks !== 'undefined') {
          //fileReceiver.receive(data, self);
        } else {
          self.onmessage(data, userid);
        }
      },
      onclose: function(event) {
        logit('onclose: event: ' + stringify(event));
        var myChannels = self.channels;
        var closedChannel = event.currentTarget;

        for (var userid in myChannels) {
          if (closedChannel === myChannels[userid].channel) {
            logit('deleting channel ' + stringify(myChannels[userid]));
            delete myChannels[userid];
          }
        }
        self.onclose(event);
      },
      openSignalingChannel: self.openSignalingChannel
    };  // end self.config

    dataConnector = new DataConnector(self, self.config);

    textReceiver = new TextReceiver(self);

    if (self.room) {
      self.config.ondatachannel(self.room);
    }
  }

  this.open = function(_channel) {
    //logit('DataChannel.open: ' + stringify(_channel));
    self.joinedARoom = true;

    if (self.socket) {
      self.socket.onDisconnect().remove();
    } else {
      self.isInitiator = true;
    }

    if (_channel) {
      self.channel = _channel;
    }

    prepareInit(function() {
      init();
      dataConnector.createRoom(_channel);
    });
  };

  this.connect = function(_channel) {
    if (_channel) {
      self.channel = _channel;
    }

    prepareInit(init);
  };

  // manually join a room
  this.joindaroom = function(room) {
    if (!room.id || !room.owner) {
      send_message('KEY_ERR', 'Invalid room info passed.');
    }

    if (!dataConnector) {
      init();
    }

    if (!dataConnector.joinRoom) {
      return;
    }

    dataConnector.joinRoom({
      roomToken: room.id,
      joinUser: room.owner
    });
  };

  this.send = function(data, _channel) {
    if (!data) {
      send_message('KEY_ERR', 'No file, data or text message to share.');
    }
    TextSender.send({
      text: data,
      channel: dataConnector,
      _channel: _channel,
      root: self
    });
  };

  this.onleave = function(userid) {
    logit(userid + 'left!');
    send_message('KEY_SYS', userid + " left!");
  };

  this.leave = this.eject = function(userid) {
    dataConnector.leave(userid, self.autoCloseEntireSession);
  };

  this.openNewSession = function(isOpenNewSession, isNonFirebaseClient) {
    if (isOpenNewSession) {
      if (self.isNewSessionOpened) return;
      self.isNewSessionOpened = true;
      if (!self.joinedARoom) self.open();
    }

    if (!isOpenNewSession || isNonFirebaseClient) {
      self.connect();
    }

    if (!isNonFirebaseClient) {
      return;
    }

    // for non-firebase clients
    setTimeout(function() {self.openNewSession(true);}, 5000);
  };

  if (typeof this.preferSCTP    === 'undefined') {this.preferSCTP = true;}//chromeVersion >= 32 ? true : false;
  if (typeof this.chunkSize     === 'undefined') {this.chunkSize =  13*1000;}//chromeVersion >= 32 ? 13 * 1000 : 1000; // 1000 chars for RTP and 13000 chars for SCTP
  if (typeof this.chunkInterval === 'undefined') {this.chunkInterval = 100;}// chromeVersion >= 32 ? 100 : 500; // 500ms for RTP and 100ms for SCTP

  if (self.automatic) {
    logit('Rob: self.automatic');
    if (window.Firebase) {
      logit('Rob: checking presence of the room..');
      send_message('KEY_SYS', "Checking Room...");
      new window.Firebase('https://webrtc-experiment.firebaseIO.com/' + self.channel).once('value', function(data) {
        logit('Rob: room is present?' + (data.val() !== null));
        send_message('KEY_SYS', "Room: " + (data.val() !== null));
        self.openNewSession(data.val() === null);
      });
    } else {
      logit('Rob: openNewSession(false, true)');
      self.openNewSession(false, true);
    }
  }
};  // End DataChannel Function

//-------------------------------------------------------------------------------- //  
// DataConnector  
//-------------------------------------------------------------------------------- //  
function DataConnector(root, config) {
  logit('Rob: DataConnector');
  logit('root: ' + stringify(root));
  logit('config: ' + stringify(config));

  var self = {};
  var that = this;

  self.userToken = (root.userid = root.userid || uniqueToken()).toString();
  //self.userToken = "bobbo";//(root.userid = root.userid || uniqueToken()).toString();
  self.sockets = [];
  self.socketObjects = {};

  var channels = '--';
  var isbroadcaster = false;
  var isGetNewRoom = true;
  var rtcDataChannels = [];

  function newPrivateSocket(_config) {
    //logit('Rob: newPrivateSocket');
    var socketConfig = {
      channel: _config.channel,
      onmessage: socketResponse,
      onopen: function() {
        if (isofferer && !peer) {
          initPeer();
        }

        _config.socketIndex = socket.index = self.sockets.length;
        self.socketObjects[socketConfig.channel] = socket;
        self.sockets[_config.socketIndex] = socket;
      }
    };

    socketConfig.callback = function(_socket) {
      socket = _socket;
      socketConfig.onopen();
    };

    var socket = root.openSignalingChannel(socketConfig);
    var isofferer = _config.isofferer;
    var gotstream;
    var inner = {};
    var peer;

    var peerConfig = {
      onICE: function(candidate) {
        //logit('Rob: onICE');
        if (!socket) {
          return setTimeout(function() {
            peerConfig.onICE(candidate);
          }, 2000);
        }

        socket.send({
          userToken: self.userToken,
          candidate: {
            sdpMLineIndex: candidate.sdpMLineIndex,
            candidate: JSON.stringify(candidate.candidate)
          }
        });
      },
      onopen: function(channel) {
        logit('Rob: onChannelOpened');
        channel.peer = peer.peer;
        rtcDataChannels.push(channel);

        config.onopen(_config.userid, channel);

        if (root.direction === 'many-to-many' && isbroadcaster && channels.split('--').length > 3 && defaultSocket) {
          defaultSocket.send({
            newParticipant: socket.channel,
            userToken: self.userToken
          });
        }

        isFirstConnectionOpened = gotstream = true;
      },
      onmessage: function(event) {
        config.onmessage(event.data, _config.userid);
        logit('Rob: peerConfig onmessage');
      },
      onclose: config.onclose,
      onerror: root.onerror,
      preferSCTP: root.preferSCTP
    };

    function initPeer(offerSDP) {
      logit('Rob: initPeer');
      if (root.direction === 'one-to-one' && isFirstConnectionOpened) {
        return;
      }
      logit('initPeer: going');
      if (!offerSDP) {
        peerConfig.onOfferSDP = sendsdp;
      } else {
        peerConfig.offerSDP = offerSDP;
        peerConfig.onAnswerSDP = sendsdp;
      }
      logit('PeerBefore: ' + stringify(peer));
      peer = new RTCPeerConnection(peerConfig);
      logit('PeerAfter: ' + stringify(peer));
    }



    function sendsdp(sdp) {
      logit('Rob: sendsdp');
      sdp = JSON.stringify(sdp);
      var part = parseInt(sdp.length / 3);

      var firstPart = sdp.slice(0, part),
          secondPart = sdp.slice(part, sdp.length - 1),
          thirdPart = '';

      if (sdp.length > part + part) {
        secondPart = sdp.slice(part, part + part);
        thirdPart = sdp.slice(part + part, sdp.length);
      }

      socket.send({
        userToken: self.userToken,
        firstPart: firstPart
      });

      socket.send({
        userToken: self.userToken,
        secondPart: secondPart
      });

      socket.send({
        userToken: self.userToken,
        thirdPart: thirdPart
      });
    }

    function socketResponse(response) {
      //logit('Rob: socketResponse');
      if (response.userToken === self.userToken) {
        return;
      }

      if (response.firstPart || response.secondPart || response.thirdPart) {
        if (response.firstPart) {
          // sdp sender's user id passed over "onopen" method
          _config.userid = response.userToken;

          inner.firstPart = response.firstPart;
          if (inner.secondPart && inner.thirdPart) {
            selfInvoker();
          }
        }
        if (response.secondPart) {
          inner.secondPart = response.secondPart;
          if (inner.firstPart && inner.thirdPart) {
            selfInvoker();
          }
        }

        if (response.thirdPart) {
          inner.thirdPart = response.thirdPart;
          if (inner.firstPart && inner.secondPart) {
            selfInvoker();
          }
        }
      }

      if (response.candidate && !gotstream && peer) {
        peer.addICE({
          sdpMLineIndex: response.candidate.sdpMLineIndex,
          candidate: JSON.parse(response.candidate.candidate)
        });

        //logit('ORIG Rob: ice candidate: ' + response.candidate.candidate);
      }

      if (response.left) {
        if (peer && peer.peer) {
          peer.peer.close();
          peer.peer = null;
        }

        if (response.closeEntireSession) {
          leaveChannels();
        } else if (socket) {
          socket.send({
            left: true,
            userToken: self.userToken
          });
          socket = null;
        }

        root.onleave(response.userToken);
      }

      if (response.playRoleOfBroadcaster) {
        setTimeout(function() {
          self.roomToken = response.roomToken;
          root.open(self.roomToken);
          self.sockets = swap(self.sockets);
        }, 600);
      }
    }

    var invokedOnce = false;

    function selfInvoker() {
      logit('Rob: selfInvoker');
      if (invokedOnce) {
        return;
      }

      invokedOnce = true;
      inner.sdp = JSON.parse(inner.firstPart + inner.secondPart + inner.thirdPart);

      if (isofferer) {
        peer.addAnswerSDP(inner.sdp);
      } else {
        initPeer(inner.sdp);
      }

      logit('ORIG Rob: sdp: ' + inner.sdp.sdp);
    }
  }

  function onNewParticipant(channel) {
    logit('Rob: onNewParticipant: ' + channel);
    if (!channel || channels.indexOf(channel) !== -1 || channel === self.userToken) {
      return;
    }

    channels += channel + '--';

    var newChannel = uniqueToken();

    newPrivateSocket({
      channel: newChannel,
      closeSocket: true
    });

    if (!defaultSocket) {
      return;
    }

    defaultSocket.send({
      participant: true,
      userToken: self.userToken,
      joinUser: channel,
      channel: newChannel
    });
  }

  function uniqueToken() {
    var token = (Math.round(Math.random() * 60535) + 5000000).toString();
    logit('Generating uniqueToken = "' + token + '"');
    return token;
  }

  function leaveChannels(channel) {
    logit('Rob: leaveChannels');
    var alert = {
      left: true,
      userToken: self.userToken
    };

    var socket;

    // if room initiator is leaving the room; close the entire session
    if (isbroadcaster) {
      if (root.autoCloseEntireSession) {
        alert.closeEntireSession = true;
      } else {
        self.sockets[0].send({
          playRoleOfBroadcaster: true,
          userToken: self.userToken,
          roomToken: self.roomToken
        });
      }
    }

    if (!channel) {
      // closing all sockets
      var sockets = self.sockets,
          length = sockets.length;

      for (var i = 0; i < length; i++) {
        socket = sockets[i];
        if (socket) {
          socket.send(alert);

          if (self.socketObjects[socket.channel]) {
            delete self.socketObjects[socket.channel];
          }

          delete sockets[i];
        }
      }

      that.left = true;
    }

    // eject a specific user!
    if (channel) {
      socket = self.socketObjects[channel];
      if (socket) {
        socket.send(alert);

        if (self.sockets[socket.index]) {
          delete self.sockets[socket.index];
        }

        delete self.socketObjects[channel];
      }
    }
    self.sockets = swap(self.sockets);
  }

  window.addEventListener('beforeunload', function() {
    leaveChannels();
  }, false);

  var defaultSocket = root.openSignalingChannel({
    onmessage: function(response) {
      //logit('Rob: defaultSocket.onmessage');
      if (response.userToken === self.userToken) {
        return;
      }

      if (isGetNewRoom && response.roomToken && response.broadcaster) {
        config.ondatachannel(response);
      }

      if (response.newParticipant) {
        onNewParticipant(response.newParticipant);
      }

      if (response.userToken && response.joinUser === self.userToken && response.participant && channels.indexOf(response.userToken) === -1) {
        channels += response.userToken + '--';

        logit('ORIG Rob: Data connection is being opened between you and ' + (response.userToken || response.channel));
        newPrivateSocket({
          isofferer: true,
          channel: response.channel || response.userToken,
          closeSocket: true
        });
      }
    },
    callback: function(socket) {
      logit('Rob: defaultSocket.callback');
      defaultSocket = socket;
    }
  }); // defaultSocket

  return {
    createRoom: function(roomToken) {
      logit('Rob: createRoom');
      self.roomToken = (roomToken || uniqueToken()).toString();

      isbroadcaster = true;
      isGetNewRoom = false;

      (function transmit() {
        logit('Rob: transmit');
        if (defaultSocket) {
          defaultSocket.send({
            roomToken: self.roomToken,
            broadcaster: self.userToken
          });
        }

        if (!root.transmitRoomOnce && !that.leaving) {
          if (root.direction === 'one-to-one') {
            if (!isFirstConnectionOpened) {
              setTimeout(transmit, 3000);
            }
          } else {
            setTimeout(transmit, 3000);
          }
        }
      })();
    },
    joinRoom: function(_config) {
      logit('Rob: joinRoom = ' + JSON.stringify(_config));
      self.roomToken = _config.roomToken;
      isGetNewRoom = false;

      newPrivateSocket({
        channel: self.userToken
      });

      defaultSocket.send({
        participant: true,
        userToken: self.userToken,
        joinUser: _config.joinUser
      });
    },
    send: function(message, _channel) {
      logit('Rob: send');
      var _channels = rtcDataChannels;
      var data;
      var length = _channels.length;

      if (!length) {
        return;
      }

      data = JSON.stringify(message);

      if (_channel) {
        if (_channel.readyState === 'open') {
          _channel.send(data);
        }
        return;
      }
      for (var i = 0; i < length; i++) {
        if (_channels[i].readyState === 'open') {
          _channels[i].send(data);
        }
      }
    },
    leave: function(userid, autoCloseEntireSession) {
      logit('Rob: leave');
      if (autoCloseEntireSession) {
        root.autoCloseEntireSession = true;
      }
      leaveChannels(userid);
      if (!userid) {
        self.joinedARoom = isbroadcaster = false;
        isGetNewRoom = true;
      }
    }
  };
}  // END DataConnector


//-------------------------------------------------------------------------------- //  
// Other Functions
//-------------------------------------------------------------------------------- //  

function getRandomString() {  // e.g. dkdo51ce-73nmi
  logit('Rob: getRandomString');
  return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '-');
}

//-------------------------------------------------------------------------------- //  
// Immediate Code
//-------------------------------------------------------------------------------- //  

// This code is executed immedately

var userid = getRandomString();
logit('userid just generated = ' + userid);
logit('Rob: userAgent = ' + navigator.userAgent);

function swap(arr) {
  var swapped = [];
  var length = arr.length;
  for (var i = 0; i < length; i++) if (arr[i]) swapped.push(arr[i]);
  return swapped;
}

var loadedIceFrame;

function loadIceFrame(callback, skip) {
  //logit('Rob: loadIceFrame');
  if (loadedIceFrame) {return;}
  if (!skip) {return loadIceFrame(callback, true);}
  loadedIceFrame = true;
}

loadIceFrame(function(iceServers) {window.iceServers = iceServers;});

function RTCPeerConnection(options) {
  logit('Rob: RTCPeerConnection options = ' + stringify(options));
  var iceServers = [];
  iceServers.push({url: 'stun:stun.l.google.com:19302'});
  iceServers.push({url: 'stun:stun.anyfirewall.com:3478'});
  iceServers.push({url: 'turn:turn.bistri.com:80', credential: 'homeo', username: 'homeo'});
  iceServers.push({url: 'turn:turn.anyfirewall.com:443?transport=tcp', credential: 'webrtc', username: 'webrtc'});
  iceServers = {iceServers: iceServers};
  var optional = {optional: []};
  var peerConnection = new webkitRTCPeerConnection(iceServers, optional);

  openOffererChannel();
  peerConnection.onicecandidate = onicecandidate;

  function onicecandidate(event) {
    if (!event.candidate || !peerConnection) {
      return;
    }

    if (options.onICE) {
      options.onICE(event.candidate);
    }
  }

  var constraints = options.constraints || {optional: [], mandatory: {OfferToReceiveAudio: false, OfferToReceiveVideo: false}};

  function onSdpError(e) {
    var message = JSON.stringify(e, null, '\t');
    if (message.indexOf('RTP/SAVPF Expects at least 4 fields') !== -1) {
      message = 'It seems that you are trying to interop RTP-datachannels with SCTP. It is not supported!';
    }
    logit('ORIG Rob: onSdpError: ' + message);
    send_message('KEY_ERR', "SDP Error!");
  }

  function onSdpSuccess() {}

  function createOffer() {
    logit('Rob: createOffer');
    if (!options.onOfferSDP) {return;}
    peerConnection.createOffer(function(sessionDescription) {
      peerConnection.setLocalDescription(sessionDescription);
      options.onOfferSDP(sessionDescription);
    }, onSdpError, constraints);
  }

  function createAnswer() {
    logit('Rob: createAnswer');
    if (!options.onAnswerSDP) {return;}
    options.offerSDP = new RTCSessionDescription(options.offerSDP);
    peerConnection.setRemoteDescription(options.offerSDP, onSdpSuccess, onSdpError);
    peerConnection.createAnswer(function(sessionDescription) {
      peerConnection.setLocalDescription(sessionDescription);
      options.onAnswerSDP(sessionDescription);
    }, onSdpError, constraints);
  }

  createOffer();
  createAnswer();

  var channel;

  function openOffererChannel() {
    logit('Rob: openOffererChannel');
    if (!options.onOfferSDP) {
      return;
    }
    logit('Rob: _openOffererChannel');
    // protocol: 'text/chat', preset: true, stream: 16
    // maxRetransmits:0 && ordered:false
    var dataChannelDict = {};
    //logit('dataChannelDict ' + JSON.stringify(dataChannelDict));
    //send_message('KEY_MSG','Dict: ' + JSON.stringify(dataChannelDict));
    channel = peerConnection.createDataChannel('channel', dataChannelDict);
    setChannelEvents();
  }


  function setChannelEvents() {
    logit('Rob: setChannelEvents');
    channel.onmessage = options.onmessage;
    channel.onopen = function() {
      options.onopen(channel);
    };
    channel.onclose = options.onclose;
    channel.onerror = options.onerror;
  }

  if (!options.onOfferSDP) {
    //openAnswererChannel();
    //function openAnswererChannel() {
    logit('Rob: openAnswererChannel');
    peerConnection.ondatachannel = function(event) {
      channel = event.channel;
      setChannelEvents();
    };
    //}
  }


  return {
    addAnswerSDP: function(sdp) {
      //logit('Rob: addAnswerSDP');
      sdp = new RTCSessionDescription(sdp);
      peerConnection.setRemoteDescription(sdp, onSdpSuccess, onSdpError);
    },
    addICE: function(candidate) {
      //logit('Rob: addICE');
      peerConnection.addIceCandidate(new RTCIceCandidate({
        sdpMLineIndex: candidate.sdpMLineIndex,
        candidate: candidate.candidate
      }));
    },
    peer: peerConnection,
    channel: channel,
    sendData: function(message) {
      logit('Rob: sendData');
      if (!channel) {
        return;
      }
      channel.send(message);
    }
  }; // END Return;
}  // END RTCPeerConnection

function SocketConnector(_channel, config) {
  logit('Rob: socketConnector');
  var socket = config.openSignalingChannel({
    channel: _channel,
    onopen: config.onopen,
    onmessage: config.onmessage,
    callback: function(_socket) {
      socket = _socket;
    }
  });

  return {
    send: function(message) {
      logit('Rob: SocketConnector - send');
      if (!socket) {
        return;
      }

      socket.send({
        userid: userid,
        message: message
      });
    }
  };
}

function TextReceiver() {
  logit('Rob: TextReceiver');
  var content = {};

  function receive(data, onmessage, userid) {
    // uuid is used to uniquely identify sending instance
    var uuid = data.uuid;
    if (!content[uuid]) {
      content[uuid] = [];
    }

    content[uuid].push(data.message);
    if (data.last) {
      var message = content[uuid].join('');
      if (data.isobject) {
        message = JSON.parse(message);
      }

      // latency detection
      var receivingTime = new Date().getTime();
      var latency = receivingTime - data.sendingTime;

      onmessage(message, userid, latency);

      delete content[uuid];
    }
  }

  return {
    receive: receive
  };
}

var TextSender = {
  send: function(config) {  // Used to send message
    logit('Rob: TextSender - send');
    var root = config.root;

    var channel = config.channel;
    var _channel = config._channel;
    var initialText = config.text;
    var packetSize = root.chunkSize || 1000;
    var textToTransfer = '';
    var isobject = false;

    if (typeof initialText !== 'string') {
      isobject = true;
      initialText = JSON.stringify(initialText);
    }

    // uuid is used to uniquely identify sending instance
    var uuid = getRandomString();
    var sendingTime = new Date().getTime();

    sendText(initialText);

    function sendText(textMessage, text) {
      logit('Rob: sendText');
      var data = {
        type: 'text',
        uuid: uuid,
        sendingTime: sendingTime
      };

      if (textMessage) {
        text = textMessage;
        data.packets = parseInt(text.length / packetSize);
      }

      if (text.length > packetSize) {
        data.message = text.slice(0, packetSize);
      } else {
        data.message = text;
        data.last = true;
        data.isobject = isobject;
      }

      channel.send(data, _channel);

      textToTransfer = text.slice(data.message.length);

      if (textToTransfer.length) {
        setTimeout(function() {
          sendText(null, textToTransfer);
        }, root.chunkInterval || 100);
      }
    }
  }
};
//})();  // end IIFE!


function send_message(thekind, text) {
  //send_message('KEY_SYS',"");
  //send_message('KEY_MSG',"");
  //send_message('KEY_ERR',"");
  // dict = {"KEY_MESSAGE" : location, "KEY_TEXT": temperature};
  if(thekind=='KEY_SYS')
    dict = {'KEY_SYS':text};
  else if(thekind=='KEY_MSG')
    dict = {"KEY_MSG":text};
  else if(thekind=='KEY_ERR')
    dict = {"KEY_ERR":text};
  else
    dict = {"KEY_ERR":text};

  Pebble.sendAppMessage(dict,
                        function(e) {/*logit('TEXT successfully sent! ');*/},
                        function(e) {logit('TEXT  failed  to  send: ' + e.error.message);}
                       );
}

Pebble.addEventListener('ready', function(e) {
  logit('PebbleKit JS Ready!');
  //Pebble.showSimpleNotificationOnPebble("BadApp", "PebbleKit JS Ready!");
  Pebble.showToast("PebbleKit JS Ready!");
  logit('Pebble Account Token: ' + Pebble.getAccountToken());  // Specific User, on any watch
  logit('Pebble Watch   Token: ' + Pebble.getWatchToken());    // Specific Watch for any user

  //logit(JSON.stringify("document: " + Pebble, censor(Pebble)));
  //logit("pebble = " + Object.getOwnPropertyNames(Pebble));

  //var thats = this;
  //logit(JSON.stringify("Pebble: " + thats, censor(thats)));

  dict = {'KEY_SYS':'Hello from PebbleKit JS!'};
  Pebble.sendAppMessage(dict);//,
  //function(e) {logit('Send  OK!');},
  //function(e) {logit('Send BAD!' + e.error.message);}
  //);
  send_message('KEY_SYS', "... READY??");
});

Pebble.addEventListener("appmessage",
                        function(e) {
                          //logit('App Message Payload: ' + JSON.stringify(e.payload)); // Payload: {"0":5,"KEY_MESSAGE":5}
                          if (e.payload.KEY_OPEN_CHANNEL) {
                            channelname = e.payload.KEY_OPEN_CHANNEL;
                            send_message('KEY_SYS', 'Opening Channel "' + channelname +'"!');
                            //if channel doesn't equal "unknown"
                            channel = new DataChannel(channelname);
                            //channel = new DataChannel();
                          } else if(e.payload.KEY_SEND_TEXT) {
                            thetext = e.payload.KEY_SEND_TEXT;
                            //send_message('KEY_SYS', 'Sending Text: "' + thetext +'"!');
                            send_message('KEY_MSG', 'ME: ' + thetext);
                            channel.send(thetext);
                          } else {
                            send_message('KEY_ERR', 'Unknown Command');
                          }
                        }
                       );


Pebble.addEventListener("showConfiguration",
                        function(e) {
                          //Load the remote config page
                          //Pebble.openURL("https://dl.dropboxusercontent.com/u/10824180/pebble%20config%20pages/sdktut9-config.html");
                          //Embedded entire HTML page above into URL below:
                          Pebble.openURL("data:text/html," + encodeURIComponent(
                            '<!DOCTYPE html><html>' +
                            '<head><title>SDKTut9 Configuration</title></head>'+
                            '<body>'+
                            '<h1>Pebble Config Tutorial</h1>'+
                            '<p>Choose watchapp settings</p>'+

                            '<p>Invert watchapp:'+
                            '<select id="invert_select">'+
                            '<option value="off">Off</option>'+
                            '<option value="on">On</option>'+
                            '</select>'+
                            '</p>'+

                            '<p><button id="save_button">Save</button></p>'+

                            '<script>'+
                            //Setup to allow easy adding more options later
                            'function saveOptions() {'+
                            'var invertSelect = document.getElementById("invert_select");'+
                            'var options = {"invert": invertSelect.options[invertSelect.selectedIndex].value};'+
                            'return options;'+
                            '};'+
                            'var submitButton = document.getElementById("save_button");'+
                            'submitButton.addEventListener("click", '+
                            'function() {'+
                            'console.log("Submit");'+
                            'var options = saveOptions();'+
                            'var location = "pebblejs://close#" + encodeURIComponent(JSON.stringify(options));'+
                            'document.location = location;'+
                            '}, '+
                            'false);'+
                            '</script>'+
                            '</body></html><!--.html'
                          )
                                        );
                        }
                       );

Pebble.addEventListener("webviewclosed",
                        function(e) {
                          //Get JSON dictionary
                          //var configuration = JSON.parse(decodeURIComponent(e.response));
                          //logit("Configuration window returned: " + JSON.stringify(configuration));

                          //Send to Pebble, persist there
                          Pebble.sendAppMessage(
                            {"KEY_SYS": "Channel Closed"},
                            function(e) {
                              logit("Sending settings data...");
                            },
                            function(e) {
                              logit("Settings feedback failed!");
                            }
                          );
                        }
                       );

// ------------------------------------------------------------------------------------------------------------------------------------------------ //
//  Internet Communication
// ------------------------------------------------------------------------------------------------------------------------------------------------ //

// https://webrtcexperiment-webrtc.netdna-ssl.com/firebase.js
