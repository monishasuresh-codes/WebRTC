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
  const [micOn, setMicOn] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const roomIdRef = useRef("");
  const localStream = useRef(null);


  // =====================================================
  // WEBRTC + SOCKET CONNECTION
  // =====================================================

  useEffect(() => {

    // Create WebRTC connection

    peerConnection.current =
      new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302"
          }
           
        ]
      });


    // =================================================
    // ICE CONNECTION STATE
    // =================================================

    peerConnection.current.oniceconnectionstatechange =
      () => {

        console.log(
          "ICE connection state:",
          peerConnection.current.iceConnectionState
        );

      };


    // =================================================
    // SOCKET.IO
    // =================================================

    socket.current =
      io("https://webrtc-gkeo.onrender.com");


    socket.current.on("connect", () => {

      console.log(
        "Connected to server:",
        socket.current.id
      );

    });


    // =================================================
    // REMOTE TRACK
    // =================================================

    peerConnection.current.ontrack =
      (event) => {

        console.log(
          "Remote track received"
        );

        const remoteStream =
          event.streams[0];

        if (!remoteStream) {

          console.log(
            "No remote stream found"
          );

          return;
        }


        console.log(
          "Remote stream:",
          remoteStream
        );


        console.log(
          "Remote tracks:",
          remoteStream.getTracks()
        );


        remoteStream
          .getTracks()
          .forEach((track) => {

            console.log(
              "Remote track:",
              track.kind,
              "readyState:",
              track.readyState,
              "enabled:",
              track.enabled
            );

          });


        // Make sure video element exists

        if (!remoteVideoRef.current) {

          console.log(
            "Remote video element not available"
          );

          return;
        }


        // Only assign the stream once

        if (
          remoteVideoRef.current.srcObject !==
          remoteStream
        ) {

          console.log(
            "Setting remote stream"
          );

          remoteVideoRef.current.srcObject =
            remoteStream;

          setRemoteConnected(true);

        }

      };


    // =================================================
    // REMOTE VIDEO EVENTS
    // =================================================

    const checkRemoteVideo =
      () => {

        if (!remoteVideoRef.current) {
          return;
        }

        console.log(
          "Remote video metadata loaded"
        );

        console.log(
          "Remote video dimensions:",
          remoteVideoRef.current.videoWidth,
          remoteVideoRef.current.videoHeight
        );

        console.log(
          "Remote video readyState:",
          remoteVideoRef.current.readyState
        );

        console.log(
          "Remote video paused:",
          remoteVideoRef.current.paused
        );

      };


    // =================================================
    // ICE CANDIDATES
    // =================================================

    peerConnection.current.onicecandidate =
      (event) => {

        if (event.candidate) {

          console.log(
            "ICE candidate found"
          );

          socket.current.emit(
            "ice-candidate",
            event.candidate,
            roomIdRef.current
          );

        }

      };


    // =================================================
    // OFFER
    // =================================================

    socket.current.on(
      "offer",
      async (offer) => {

        console.log(
          "Offer received from another user"
        );


        await peerConnection.current
          .setRemoteDescription(
            offer
          );


        console.log(
          "Remote description set"
        );


        const answer =
          await peerConnection.current
            .createAnswer();


        console.log(
          "Answer created"
        );


        await peerConnection.current
          .setLocalDescription(
            answer
          );


        console.log(
          "Local description set"
        );


        socket.current.emit(
          "answer",
          answer,
          roomIdRef.current
        );

      }
    );


    // =================================================
    // ANSWER
    // =================================================

    socket.current.on(
      "answer",
      async (answer) => {

        console.log(
          "Answer received from another user"
        );


        if (
          peerConnection.current
            .signalingState ===
          "have-local-offer"
        ) {

          await peerConnection.current
            .setRemoteDescription(
              answer
            );


          console.log(
            "Remote answer set"
          );

        }

      }
    );


    // =================================================
    // ICE CANDIDATE RECEIVED
    // =================================================

    socket.current.on(
      "ice-candidate",
      async (candidate) => {

        console.log(
          "ICE candidate received"
        );


        try {

          await peerConnection.current
            .addIceCandidate(
              candidate
            );


          console.log(
            "ICE candidate added"
          );

        } catch (error) {

          console.error(
            "Error adding ICE candidate:",
            error
          );

        }

      }
    );


    // =================================================
    // CLEANUP
    // =================================================

    return () => {

      if (socket.current) {

        socket.current.disconnect();

      }


      if (peerConnection.current) {

        peerConnection.current.close();

      }

    };

  }, []);


  // =====================================================
  // START CAMERA
  // =====================================================

  async function startCamera() {

    try {

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: true
          });


      console.log(
        "Camera started"
      );


      console.log(
        "Video tracks:",
        stream.getVideoTracks()
      );


      console.log(
        "Video track state:",
        stream
          .getVideoTracks()[0]
          .readyState
      );


      localStream.current =
        stream;


      // Show own video

      if (videoRef.current) {

        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();

        console.log(
          "Video playing"
        );

      }


      const videoTrack =
        stream.getVideoTracks()[0];


      const audioTrack =
        stream.getAudioTracks()[0];


      // Add video track

      peerConnection.current.addTrack(
        videoTrack,
        stream
      );


      // Add audio track

      peerConnection.current.addTrack(
        audioTrack,
        stream
      );


      console.log(
        "Camera and microphone added"
      );

    } catch (error) {

      console.error(
        "Camera error:",
        error
      );


      alert(
        "Could not access camera or microphone."
      );

    }

  }


  // =====================================================
  // TOGGLE MICROPHONE
  // =====================================================

  function toggleMic() {

    if (!localStream.current) {
      return;
    }


    const audioTrack =
      localStream.current
        .getAudioTracks()[0];


    if (!audioTrack) {
      return;
    }


    audioTrack.enabled =
      !audioTrack.enabled;


    setMicOn(
      audioTrack.enabled
    );


    console.log(
      audioTrack.enabled
        ? "Microphone ON"
        : "Microphone OFF"
    );

  }


  // =====================================================
  // START CALL
  // =====================================================

  async function startCall() {

    try {

      console.log(
        "Creating offer"
      );


      const offer =
        await peerConnection.current
          .createOffer();


      console.log(
        "Offer created"
      );


      await peerConnection.current
        .setLocalDescription(
          offer
        );


      console.log(
        "Local description set"
      );


      socket.current.emit(
        "offer",
        offer,
        roomIdRef.current
      );


      console.log(
        "Offer sent"
      );

    } catch (error) {

      console.error(
        "Start call error:",
        error
      );

    }

  }


  // =====================================================
  // GENERATE ROOM ID
  // =====================================================

  function generateRoomId() {

    return Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  }


  // =====================================================
  // CREATE CLASS
  // =====================================================

  function createClass() {

    const newRoomId =
      generateRoomId();


    setRoomId(
      newRoomId
    );


    console.log(
      "Class created:",
      newRoomId
    );

  }


  // =====================================================
  // JOIN CLASS
  // =====================================================

  function joinClass() {

    if (!roomId.trim()) {

      alert(
        "Please enter a class code"
      );

      return;

    }


    const cleanRoomId =
      roomId
        .trim()
        .toUpperCase();


    roomIdRef.current =
      cleanRoomId;


    socket.current.emit(
      "join-room",
      cleanRoomId
    );


    setRoomId(
      cleanRoomId
    );


    setJoined(
      true
    );


    console.log(
      "Joined class:",
      cleanRoomId
    );

  }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="app">

      {!joined ? (

        /* =================================================
           HOME PAGE
           ================================================= */

        <div className="home-page">

          <nav className="navbar">

            <div className="logo">

              <span className="logo-icon">
                ◉
              </span>

              <span>
                VideoMeet
              </span>

            </div>


            <div className="nav-right">
              Secure • Simple • Reliable
            </div>

          </nav>


          <main className="home-content">

            <section className="hero-section">


              {/* HERO TEXT */}

              <div className="hero-text">

                <p className="small-heading">
                  VIDEO MEETING PLATFORM
                </p>


                <h1>

                  Connect.
                  <br />

                  Communicate.
                  <br />

                  <span>
                    Collaborate.
                  </span>

                </h1>


                <p className="hero-description">

                  Start or join a video meeting instantly.
                  Share a class code and connect with others
                  from anywhere.

                </p>


                <div className="action-area">


                  {/* CREATE CLASS */}

                  <div className="create-box">

                    <h2>
                      Create a Class
                    </h2>


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

                        <span>
                          Your Class Code
                        </span>


                        <strong>
                          {roomId}
                        </strong>


                        <button
                          className="join-created-btn"
                          onClick={joinClass}
                        >

                          Enter Class →

                        </button>

                      </div>

                    )}

                  </div>


                  {/* DIVIDER */}

                  <div className="divider">

                    <span>
                      OR
                    </span>

                  </div>


                  {/* JOIN CLASS */}

                  <div className="join-box">

                    <h2>
                      Join a Class
                    </h2>


                    <p>

                      Enter the class code shared by your
                      teacher or host.

                    </p>


                    <input
                      type="text"
                      placeholder="Enter class code"
                      value={roomId}
                      onChange={(e) =>
                        setRoomId(
                          e.target.value.toUpperCase()
                        )
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


              {/* HERO VISUAL */}

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

            <span>
              © 2026 VideoMeet
            </span>


            <span>
              Built with WebRTC
            </span>

          </footer>

        </div>


      ) : (

        /* =================================================
           MEETING PAGE
           ================================================= */

        <div className="meeting-page">


          {/* TOP BAR */}

          <header className="meeting-header">

            <div className="meeting-left">

              <div className="meeting-logo">
                ◉
              </div>


              <div className="meeting-info">

                <h2>
                  VideoMeet
                </h2>


                <div className="meeting-code">

                  <span>
                    Class
                  </span>


                  <strong>
                    {roomId}
                  </strong>

                </div>

              </div>

            </div>


            <div className="meeting-right">

              <div className="connection-status">

                <span className="status-dot"></span>

                <span>
                  Connected
                </span>

              </div>


              <button className="header-btn">
                ⓘ
              </button>


              <button className="header-btn">
                ⋮
              </button>

            </div>

          </header>


          {/* MAIN MEETING */}

          <main className="meeting-main">


            {/* REMOTE VIDEO */}

            <div className="remote-video-container">

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                onLoadedMetadata={() => {

                  console.log(
                    "Remote video metadata loaded"
                  );


                  console.log(
                    "Remote video dimensions:",
                    remoteVideoRef.current?.videoWidth,
                    remoteVideoRef.current?.videoHeight
                  );


                  console.log(
                    "Remote video readyState:",
                    remoteVideoRef.current?.readyState
                  );


                  console.log(
                    "Remote video paused:",
                    remoteVideoRef.current?.paused
                  );

                }}
              />


              {/* WAITING SCREEN */}

              {!remoteConnected && (

                <div className="waiting-state">

                  <div className="waiting-avatar">
                    👤
                  </div>


                  <h3>
                    Waiting for someone to join
                  </h3>


                  <p>

                    Share the class code with another
                    participant.

                  </p>

                </div>

              )}


              {/* PARTICIPANT INFO */}

              <div className="participant-info">

                <span className="participant-mic">
                  🎤
                </span>


                <span>
                  Participant
                </span>

              </div>

            </div>


            {/* MY VIDEO */}

            <div className="my-video-container">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />


              <div className="my-video-name">
                You
              </div>

            </div>


            {/* DEVELOPMENT BUTTONS */}

            <div className="development-controls">

              <button
                className="dev-camera-btn"
                onClick={startCamera}
              >

                Start Camera

              </button>


              <button
                className="dev-call-btn"
                onClick={startCall}
              >

                Start Call

              </button>

            </div>

          </main>


          {/* BOTTOM CONTROLS */}

          <footer className="meeting-controls">


            <div className="controls-left">


              {/* MICROPHONE */}

              <button
                className="control-btn"
                onClick={toggleMic}
              >

                <span className="control-icon">

                  {micOn
                    ? "🎤"
                    : "🔇"}

                </span>


                <span className="control-label">

                  {micOn
                    ? "Mute"
                    : "Unmute"}

                </span>

              </button>


              {/* CAMERA */}

              <button className="control-btn">

                <span className="control-icon">
                  📹
                </span>


                <span className="control-label">
                  Camera
                </span>

              </button>


              {/* SHARE */}

              <button className="control-btn">

                <span className="control-icon">
                  🖥️
                </span>


                <span className="control-label">
                  Share
                </span>

              </button>


              {/* PEOPLE */}

              <button className="control-btn">

                <span className="control-icon">
                  👥
                </span>


                <span className="control-label">
                  People
                </span>

              </button>


              {/* CHAT */}

              <button className="control-btn">

                <span className="control-icon">
                  💬
                </span>


                <span className="control-label">
                  Chat
                </span>

              </button>


              {/* MORE */}

              <button className="control-btn">

                <span className="control-icon">
                  ⋯
                </span>


                <span className="control-label">
                  More
                </span>

              </button>

            </div>


            {/* LEAVE */}

            <button className="leave-btn">

              <span>
                ☎
              </span>


              <span>
                Leave
              </span>

            </button>

          </footer>

        </div>

      )}

    </div>

  );

}

export default App;