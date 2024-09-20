import { useEffect, useRef } from 'react';
import { socket } from './config/socket/socket.ts';
import { servers } from './config/stunServers';

function App() {
  // Local stream variables
  const peerConnection = new RTCPeerConnection(servers);
  const localStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Remote stream variables
  const remoteStream = new MediaStream();
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const startLocalVideo = async () => {
      // Capture video and audio from user device
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        // Set media source for local video
        localVideoRef.current.srcObject = localStream.current;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      localStream.current.getTracks().forEach((track) => {
        if (localStream.current) {
          // Add audio and video track from local stream into remote stream
          peerConnection.addTrack(track, localStream.current);
        }
      });
    };

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        console.log(track, remoteStream);

        remoteStream.addTrack(track);
      });
    };

    startLocalVideo();
  }, []);

  const handleStreamStart = async () => {
    // Create offer
    const offer = await peerConnection.createOffer();

    // Set created offer as local description
    await peerConnection.setLocalDescription(offer);

    socket.emit('call', {
      offer,
    });
  };

  useEffect(() => {
    const handleRequest = async (data: {
      id: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      // console.log('User wants to connect, offer:', data);
      const sdp = new RTCSessionDescription(data.offer);
      // Set offer from another user on call request
      await peerConnection.setRemoteDescription(sdp);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('answer', { answer });
    };

    socket.on('request', handleRequest);

    return () => {
      socket.off('request', handleRequest);
    };
  }, []);

  useEffect(() => {
    const handleResponse = async (data: {
      id: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      // Set answer from another user on call response
      const sdp = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(sdp);
    };

    socket.on('response', handleResponse);

    return () => {
      socket.off('response', handleResponse);
    };
  }, []);

  useEffect(() => {
    const handleLocalIceCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit('candidate', { candidate: event.candidate });
      }
    };

    peerConnection.addEventListener('icecandidate', handleLocalIceCandidate);

    return () => {
      peerConnection.removeEventListener(
        'icecandidate',
        handleLocalIceCandidate,
      );
    };
  }, []);

  // onConnect
  useEffect(() => {
    const handlePeersConnection = () => {
      if (peerConnection.connectionState === 'connected') {
        // Peers connected!
        console.log('Peers connected');
      }
    };

    peerConnection.addEventListener(
      'connectionstatechange',
      handlePeersConnection,
    );

    return () => {
      peerConnection.removeEventListener(
        'connectionstatechange',
        handlePeersConnection,
      );
    };
  }, []);

  useEffect(() => {
    const handleRemoteIceCandidate = async (data: {
      candidate: RTCIceCandidate;
    }) => {
      if (data.candidate) {
        await peerConnection.addIceCandidate(data.candidate);
      }
    };

    socket.on('icecandidate', handleRemoteIceCandidate);

    return () => {
      socket.off('icecandidate', handleRemoteIceCandidate);
    };
  }, []);

  return (
    <>
      <div className="flex justify-between">
        <div>
          <h1>Local stream</h1>
          <video autoPlay muted playsInline ref={localVideoRef} />
        </div>

        <div>
          <h1>Remote stream</h1>
          <video autoPlay playsInline ref={remoteVideoRef} />
        </div>
      </div>
      <p>{socket.id}</p>
      <button onClick={handleStreamStart}>Start call</button>
    </>
  );
}

export default App;
