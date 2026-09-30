import { Server } from "socket.io";
import { createServer } from "http";

const server = createServer();

const io = new Server(server, {
 cors: {
  origin: [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://192.168.0.111:5173",
    "https://192.168.0.111:5173",
    "http://localhost:5174",
    "https://localhost:5174",
    "http://192.168.0.111:5174",
    "https://192.168.0.111:5174"
  ]
}
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Signaling server running on port ${PORT}`);
});

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // JOIN ROOM
  socket.on("join-room", (roomId) => {

    socket.join(roomId);

    console.log(
      socket.id,
      "joined room:",
      roomId
    );

    // Tell the other users in the room
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // OFFER
  socket.on("offer", (offer, roomId) => {

    console.log("Offer received for room:", roomId);

    socket.to(roomId).emit("offer", offer);
  });

  // ANSWER
  socket.on("answer", (answer, roomId) => {

    console.log("Answer received for room:", roomId);

    socket.to(roomId).emit("answer", answer);
  });

  // ICE CANDIDATE
  socket.on("ice-candidate", (candidate, roomId) => {

    console.log(
      "ICE candidate received for room:",
      roomId
    );

    socket.to(roomId).emit(
      "ice-candidate",
      candidate
    );
  });

  // LEAVE
  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});