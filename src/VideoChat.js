import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Webcam from 'react-webcam';
import { MdScreenShare, MdStopScreenShare, MdVideocamOff, MdVideocam, MdMicOff, MdMic } from 'react-icons/md';
import { useParams } from 'react-router-dom'; // Import useParams
import './VideoChat.css'; // Create VideoChat.css for styling

const socket = io.connect('http://localhost:3001');

function VideoChat() {
  const { roomId } = useParams(); // Get roomId from URL parameters
  const [remoteStream, setRemoteStream] = useState(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const webcamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    socket.emit('join_room', roomId); // Use roomId from URL

    socket.on('receive_screen', (data) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = data.stream;
      }
    });

    socket.on('video_offer', async (data) => {
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('video_answer', { room: roomId, answer }); // Use roomId
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

    socket.on('ontrack', (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });

    return () => {
      socket.off('receive_screen');
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('ice_candidate');
      socket.off('ontrack');
    };
  }, [roomId]);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setIsSharingScreen(true);
      socket.emit('share_screen', { room: roomId, stream }); // Use roomId
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
        socket.emit('ice_candidate', { room: roomId, candidate: event.candidate }); // Use roomId
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnectionRef.current.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit('video_offer', { room: roomId, offer }); // Use roomId
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    };
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  return (
    <div className="video-chat">
      <div className="video-container">
        <Webcam audio={true} video={true} ref={webcamRef} style={{ display: isCameraOn ? 'block' : 'none' }} />
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
  );
}

export default VideoChat;