import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Webcam from 'react-webcam';
import { MdScreenShare, MdStopScreenShare, MdVideocamOff, MdVideocam, MdMicOff, MdMic } from 'react-icons/md';
import './App.css';

const socket = io.connect('http://localhost:3001');

function App() {
  const [room, setRoom] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const webcamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const joinRoom = () => {
    if (room !== '') {
      socket.emit('join_room', room);
      setShowChat(true);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setIsSharingScreen(true);
      socket.emit('share_screen', { room, stream });
      handleStream(stream);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const stopScreenShare = () => {
    if (webcamRef.current && webcamRef.current.video.srcObject) {
      webcamRef.current.video.srcObject.getTracks().forEach((track) => track.stop());
    }
    setIsSharingScreen(false);
  };

  const handleStream = (stream) => {
    if (!peerConnectionRef.current) {
      createPeerConnection();
    }
    stream.getTracks().forEach((track) => {
      peerConnectionRef.current.addTrack(track, stream);
    });
  };

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', { room, candidate: event.candidate });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnectionRef.current.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('video_offer', { room, offer });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    };
  };

  useEffect(() => {
    socket.on('receive_screen', (data) => {
      handleStream(data.stream);
    });

    socket.on('video_offer', async (data) => {
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('video_answer', { room, answer });
    });

    socket.on('video_answer', async (data) => {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on('ice_candidate', async (data) => {
      try {
        if (data.candidate) {
          await peerConnectionRef.current.addIceCandidate(data.candidate);
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    return () => {
      socket.off('receive_screen');
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('ice_candidate');
    };
  }, [room]);

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  return (
    <div className="App">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Join A Chat</h3>
          <input
            type="text"
            placeholder="Room ID..."
            onChange={(event) => {
              setRoom(event.target.value);
            }}
          />
          <button onClick={joinRoom}>Join A Room</button>
        </div>
      ) : (
        <div className="chat-window">
          <div className="video-container">
            <Webcam audio={true} video={true} ref={webcamRef} style={{display: isCameraOn ? 'block' : 'none'}}/>
            <video ref={remoteVideoRef} autoPlay playsInline srcObject={remoteStream} />
            <div className="controls">
              <button onClick={isSharingScreen ? stopScreenShare : startScreenShare}>
                {isSharingScreen ? <MdStopScreenShare /> : <MdScreenShare />}
              </button>
              <button onClick={toggleCamera}>{isCameraOn ? <MdVideocam /> : <MdVideocamOff />}</button>
              <button onClick={toggleMic}>{isMicOn ? <MdMic /> : <MdMicOff />}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;