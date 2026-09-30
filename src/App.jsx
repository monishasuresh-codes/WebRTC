import './App.css'
import { useRef, useEffect, useState } from 'react';
import { io } from "socket.io-client";

function App() {
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const roomIdRef = useRef("");

  useEffect(() => {
    peerConnection.current = new RTCPeerConnection();
    socket.current = io();
    socket.current.on("connect", () => {
      console.log(
        "Connected to server:",
        socket.current.id
      );
    });

    peerConnection.current.ontrack = (event) => {
      console.log("Remote track received");
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate found");
        socket.current.emit(
          "ice-candidate",
          event.candidate,
          roomIdRef.current
        );
      }
    };

    socket.current.on("offer", async (offer) => {
      console.log("Offer received from another user");
      await peerConnection.current.setRemoteDescription(
        offer
      );

      console.log("Remote description set");
      const answer =
        await peerConnection.current.createAnswer();
      console.log("Answer created");
      await peerConnection.current.setLocalDescription(
        answer
      );

      console.log("Local description set");
      socket.current.emit("answer", answer,roomIdRef.current);
    });

    socket.current.on("answer", async (answer) => {
      console.log("Answer received from another user");
      if (
        peerConnection.current.signalingState ===
        "have-local-offer"
      ) {
        await peerConnection.current.setRemoteDescription(
          answer
        );
        console.log("Remote answer set");
      }
    });
    socket.current.on(
      "ice-candidate",
      async (candidate) => {
        console.log("ICE candidate received");
        try {
          await peerConnection.current.addIceCandidate(
            candidate
          );
          console.log("ICE candidate added");
        } catch (error) {
          console.error(
            "Error adding ICE candidate:",
            error
          );
        }
      }
    );
    return () => {
      socket.current.disconnect();
      peerConnection.current.close();
    };
  }, []);
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  console.log("Camera started");
  console.log("Video tracks:", stream.getVideoTracks());
  console.log("Video track state:", stream.getVideoTracks()[0].readyState);

  videoRef.current.srcObject = stream;

  await videoRef.current.play();

  console.log("Video playing");

  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];

  peerConnection.current.addTrack(videoTrack, stream);
  peerConnection.current.addTrack(audioTrack, stream);

  console.log("Camera and microphone added");
}
  async function startCall() {
    console.log("Creating offer");
    const offer =
      await peerConnection.current.createOffer();
    console.log("Offer created");
    await peerConnection.current.setLocalDescription(
      offer
    );
    console.log("Local description set");
    socket.current.emit("offer", offer,roomIdRef.current);
    console.log("Offer sent");
  }
  function generateRoomId() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}
function createClass() {

  const newRoomId = generateRoomId();

  setRoomId(newRoomId);

  console.log("Class created:", newRoomId);
}
function joinClass() {

  if (!roomId.trim()) {
    alert("Please enter a class code");
    return;
  }

  const cleanRoomId = roomId.trim().toUpperCase();

  roomIdRef.current = cleanRoomId;

  socket.current.emit("join-room", cleanRoomId);

  setRoomId(cleanRoomId);
  setJoined(true);

  console.log("Joined class:", cleanRoomId);
}

return (
  <div>

    <h1>Video Meet</h1>

    {!joined && (
      <div>

        <h2>Create a Class</h2>

        <button onClick={createClass}>
          Create Class
        </button>

        {roomId && (
          <div>
            <p>Your Class Code:</p>

            <h2>{roomId}</h2>

            <button onClick={joinClass}>
              Join This Class
            </button>
          </div>
        )}

        <hr />

        <h2>Join a Class</h2>

        <input
          type="text"
          placeholder="Enter class code"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button onClick={joinClass}>
          Join Class
        </button>

      </div>
    )}

    {joined && (
      <div>

        <h2>Class: {roomId}</h2>

        <button onClick={startCamera}>
          Start Camera
        </button>

        <button onClick={startCall}>
          Start Call
        </button>

        <div>
          <h2>My Video</h2>

          <video
            ref={videoRef}
            autoPlay
            playsInline
          />
        </div>

        <div>
          <h2>Remote Video</h2>

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
          />
        </div>

      </div>
    )}

  </div>
);
}
export default App;