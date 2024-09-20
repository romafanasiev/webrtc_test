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

// function App() {
//   // Peer connection (Global State)
//   const peerConnection = new RTCPeerConnection(servers);
//   const localStream = useRef<MediaStream | null>(null);
//   const remoteStream = useRef<MediaStream | null>(null);
//   const userVideoRef = useRef<HTMLVideoElement | null>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
//   const inputRef = useRef<HTMLInputElement | null>(null);
//
//   // console.log('RTCPeerConnection properties', peerConnection);
//
//   const handleUserMediaStream = async () => {
//     localStream.current = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: false,
//     });
//
//     remoteStream.current = new MediaStream();
//
//     // Push tracks from local stream to peer connection
//     if (localStream.current) {
//     }
//     localStream.current.getTracks().forEach((track) => {
//       if (localStream.current) {
//         peerConnection.addTrack(track, localStream.current);
//       }
//     });
//
//     // Pull tracks from remote stream, add to video stream
//     peerConnection.ontrack = (event) => {
//       event.streams[0].getTracks().forEach((track) => {
//         if (remoteStream.current) {
//           remoteStream.current.addTrack(track);
//         }
//       });
//     };
//
//     if (userVideoRef.current && remoteVideoRef.current) {
//       userVideoRef.current.srcObject = localStream.current;
//       remoteVideoRef.current.srcObject = remoteStream.current;
//     }
//   };
//
//   const handleCall = async () => {
//     if (inputRef.current) {
//       inputRef.current.value = '2dae8a3d-6a47-4d7c-adb9-8065e61f2b50';
//     }
//
//     // Get candidates for caller
//     peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         console.log('Ice candidate', event.candidate.toJSON());
//       }
//
//       console.log(event);
//     };
//
//     // Create offer
//     const offerDescription = await peerConnection.createOffer();
//     console.log('offer description', offerDescription);
//     await peerConnection.setLocalDescription(offerDescription);
//     console.log(peerConnection);
//
//     // // const callDoc = doc(firestore, 'calls');
//     // // const offerCandidates = doc(firestore, 'calls', 'offerCandidates');
//     // // const answerCandidates = doc(firestore, 'calls', 'answerCandidates');
//     //
//     // // if (inputRef.current) {
//     // //   inputRef.current.value = callDoc.id;
//     // // }
//     //
//     // // Get candidates for caller, save to db
//     // peerConnection.onicecandidate = (event) => {
//     //   if (event.candidate) {
//     //     console.log(event.candidate.toJSON());
//     //   }
//     //   // event.candidate && setDoc(offerCandidates, event.candidate.toJSON());
//     // };
//     //
//     // // Create offer
//     // const offerDescription = await peerConnection.createOffer();
//     // await peerConnection.setLocalDescription(offerDescription);
//     //
//     // const offer = {
//     //   sdp: offerDescription.sdp,
//     //   type: offerDescription.type,
//     // };
//     //
//     // // await setDoc(callDoc, { offer });
//     //
//     // // Listen for remote answer
//     // // onSnapshot(callDoc, (snapshot) => {
//     // //   const data = snapshot.data();
//     // //
//     // //   if (!peerConnection.currentRemoteDescription && data?.answer) {
//     // //     const answerDescription = new RTCSessionDescription(data.answer);
//     // //     peerConnection.setRemoteDescription(answerDescription);
//     // //   }
//     // // });
//     //
//     // // When answered, add candidate to peer connection
//     // // onSnapshot(answerCandidates, (snapshot) => {
//     // //   snapshot.docChanges().forEach((change) => {
//     // //     if (change.type === 'added') {
//     // //       const candidate = new RTCIceCandidate(change.doc.data());
//     // //       peerConnection.addIceCandidate(candidate);
//     // //     }
//     // //   });
//     // // });
//   };
//
//   const handleAnswer = async () => {
//     // const callId = inputRef?.current?.value;
//     // // const answerCandidates = doc(firestore, 'calls', 'answerCandidates');
//     //
//     // if (callId) {
//     //   // const callDoc = doc(firestore, 'calls', callId);
//     //
//     //   peerConnection.onicecandidate = (event) => {
//     //     if (event.candidate) {
//     //       console.log(event.candidate.toJSON());
//     //     }
//     //
//     //     // event.candidate && setDoc(answerCandidates, event.candidate.toJSON());
//     //   };
//     //
//     //   // const callData = (await getDoc(doc(firestore, 'calls', callId))).data();
//     //
//     //   // const offerDescription = callData?.offer;
//     //   // await peerConnection.setRemoteDescription(
//     //   //   new RTCSessionDescription(offerDescription),
//     //   // );
//     //
//     //   const answerDescription = await peerConnection.createAnswer();
//     //   await peerConnection.setLocalDescription(answerDescription);
//     //
//     //   const answer = {
//     //     type: answerDescription.type,
//     //     sdp: answerDescription.sdp,
//     //   };
//     //
//     //   // await updateDoc(callDoc, { answer });
//     // }
//   };

export default App;
