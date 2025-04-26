const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const socketio = require("socket.io");

const User = require("./models/User");
const Group = require("./models/Group");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// routes here...

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinGroup", async (groupId) => {
    socket.join(groupId);
    console.log(`User joined group ${groupId}`);

    const messages = await Message.find({ groupId }).sort({ timestamp: 1 });
    messages.forEach((msg) => {
      socket.emit("groupMessage", msg);
    });
  });

  socket.on("groupMessage", async ({ groupId, senderId, text }) => {
    const message = new Message({ groupId, senderId, text });
    await message.save();

    io.to(groupId).emit("groupMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

mongoose.connect("mongodb://localhost:27017/chatapp", { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log("MongoDB connected");
  server.listen(3002, () => console.log("Server running on http://localhost:3002"));
});
