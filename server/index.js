import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { config } from "dotenv";

config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: process.env.ALLOWED_ORIGIN,
});

let users = [];

io.on("connect", (socket) => {
  users.push(socket.id);
  console.log(users);

  socket.on("disconnect", () => {
    console.log("disconnect");
    users = users.filter((user) => user.id !== socket.id);
    console.log("users");
  });

  socket.on("call", (data) => {
    socket.broadcast.emit("request", data);
  });

  socket.on("answer", (data) => {
    socket.broadcast.emit("response", data);
  });

  socket.on("candidate", (data) => {
    socket.broadcast.emit("icecandidate", data);
  });
});

const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`Server ready on port ${port}`, "Users:", users);
});
