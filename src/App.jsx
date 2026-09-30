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
    peerConnection.current = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
});
peerConnection.current.oniceconnectionstatechange = () => {
  console.log(
    "ICE connection state:",
    peerConnection.current.iceConnectionState
  );
};

socket.current = io("https://webrtc-gkeo.onrender.com");
    socket.current = io("https://webrtc-gkeo.onrender.com");
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
  <div className="app">

    {!joined ? (
      <div className="home-page">

        <nav className="navbar">
          <div className="logo">
            <span className="logo-icon">◉</span>
            <span>VideoMeet</span>
          </div>

          <div className="nav-right">
            <span>Secure • Simple • Reliable</span>
          </div>
        </nav>

        <main className="home-content">

          <section className="hero-section">

            <div className="hero-text">
              <p className="small-heading">
                VIDEO MEETING PLATFORM
              </p>

              <h1>
                Connect.
                <br />
                Communicate.
                <br />
                <span>Collaborate.</span>
              </h1>

              <p className="hero-description">
                Start or join a video meeting instantly.
                No complicated setup. Just share the class
                code and connect.
              </p>

              <div className="action-area">

                <div className="create-box">
                  <h2>Create a Class</h2>

                  <p>
                    Start a new video meeting and invite
                    others using your class code.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={createClass}
                  >
                    + Create Class
                  </button>

                  {roomId && (
                    <div className="class-code-box">

                      <span>Your Class Code</span>

                      <strong>{roomId}</strong>

                      <button
                        className="join-created-btn"
                        onClick={joinClass}
                      >
                        Enter Class →
                      </button>

                    </div>
                  )}
                </div>

                <div className="divider">
                  <span>OR</span>
                </div>

                <div className="join-box">
                  <h2>Join a Class</h2>

                  <p>
                    Enter the class code shared by your
                    teacher or host.
                  </p>

                  <input
                    type="text"
                    placeholder="Enter class code"
                    value={roomId}
                    onChange={(e) =>
                      setRoomId(e.target.value.toUpperCase())
                    }
                    maxLength={6}
                  />

                  <button
                    className="secondary-btn"
                    onClick={joinClass}
                  >
                    Join Class →
                  </button>

                </div>

              </div>
            </div>

            <div className="hero-visual">

              <div className="video-preview">

                <div className="preview-header">
                  <span className="live-dot"></span>
                  VideoMeet
                </div>

                <div className="preview-screen">

                  <div className="person-circle">
                    👩🏻
                  </div>

                  <div className="preview-name">
                    Ready to connect?
                  </div>

                </div>

                <div className="preview-controls">
                  <div>🎤</div>
                  <div>📹</div>
                  <div>💬</div>
                  <div>👥</div>
                </div>

              </div>

              <div className="floating-card card-one">
                🎥 HD Video
              </div>

              <div className="floating-card card-two">
                🔒 Secure Meeting
              </div>

            </div>

          </section>

        </main>

        <footer className="home-footer">
          <span>© 2026 VideoMeet</span>
          <span>Built with WebRTC</span>
        </footer>

      </div>

    ) : (

      /* Meeting UI will be designed next */
      <div className="meeting-page">

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