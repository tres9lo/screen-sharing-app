import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [peerConnections, setPeerConnections] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const videoRef = useRef();

  useEffect(() => {
    const signalingServer = io('http://localhost:3001');

    signalingServer.on('new-peer', (data) => {
      handleNewPeer(data);
    });

    signalingServer.on('send-message', (data) => {
      receiveMessage(data);
    });

    setSocket(signalingServer);

    return () => {
      signalingServer.disconnect();
    };
  }, []);

  const startScreenSharing = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      videoRef.current.srcObject = mediaStream;
      setLocalStream(mediaStream);
    } catch (error) {
      console.error('Error starting screen sharing:', error);
    }
  };

  const handleNewPeer = (data) => {
    const { peerId, initiator } = data;

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302',
          ],
        },
      ],
    });

    setPeerConnections((prevPeerConnections) => [...prevPeerConnections, peerConnection]);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('send-message', { peerId, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prevRemoteStreams) => [...prevRemoteStreams, event.streams[0]]);
    };

    if (initiator === socket.id) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('send-message', { peerId, offer });
    }
  };

  const receiveMessage = async (data) => {
    const { peerId, offer, candidate } = data;

    const peerConnection = peerConnections.find(
      (connection) => connection.getSenders().length === 0
    );

    if (offer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('send-message', { peerId, answer });
    } else if (candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const stopScreenSharing = () => {
    localStream.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
  };

  return (
    <div className="App">
      <h1>Screen Sharing App</h1>
      {!localStream && (
        <button onClick={startScreenSharing}>Start Screen Sharing</button>
      )}
      {localStream && (
        <>
          <video ref={videoRef} autoPlay playsInline />
          <button onClick={stopScreenSharing}>Stop Screen Sharing</button>
        </>
      )}
      {remoteStreams.map((stream, index) => (
        <video key={index} autoPlay playsInline srcObject={stream} />
      ))}
    </div>
  );
};

export default App;