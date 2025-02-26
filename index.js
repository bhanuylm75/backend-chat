import express from 'express';
import User from './models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import Message from './models/messagemodel.js';
import Chat from './models/mychatsmodel.js';

import http from 'http';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3002;
//const dbURI = process.env.DB_URI;
const JWT_SECRET = "zoom";


import mongoose from 'mongoose';

const dbURI = 'mongodb+srv://bhanuylm01:bhanuylm@cluster-chat.sws0r.mongodb.net/?retryWrites=true&w=majority';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // adjust if needed for security
    methods: ["GET", "POST"]
  }
});

const connectDB = async () => {
  try {
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};



app.get("/",(req,res)=>{
  res.send("Hello from server");
})


app.post('/api/register', async (req, res) => {
  console.log(req.body)
  try {
    const { name, email, password, profilePic } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create and save the new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profilePic: profilePic || '',  // Defaults to an empty string if not provided
    });

    await newUser.save();

    // Generate a JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '1h' }  // Token valid for 1 hour
    );

    // Respond with the user data and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profilePic: newUser.profilePic,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});


app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate a JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Respond with user data (excluding password) and token
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// GET all users from DB
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Optionally, validate the id format here
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error while fetching user" });
  }
});


app.post("/api/messages", async (req, res) => {
  try {
    const { chatId, senderId, receiverId, text } = req.body;

    const newMessage = new Message({
      chatId,
      senderId,
      receiverId,
      text,
      timestamp: new Date(),
    });

    await newMessage.save();
    res.status(201).json({ success: true, message: "Message stored successfully." });
  } catch (error) {
    console.error("Error storing message:", error);
    res.status(500).json({ success: false, error: "Failed to store message." });
  }
});

app.get("/api/messages/:chatId", async (req, res) => {
  try {
    console.log("from msg api")
    const chatId = req.params.chatId;
    console.log(chatId)
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ message: "Failed to retrieve messages." });
  }
});


// This endpoint creates a new chat with a given chatId and chatPartner details.
app.post("/", async (req, res) => {
  const { userid, chatPartner } = req.body;

  
  if (!userid || !chatPartner || !chatPartner._id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if a chat document already exists for this user and chat partner.
    const existingChat = await Chat.findOne({ userid, "chatPartner._id": chatPartner._id });
    if (!existingChat) {
      const newChat = new Chat({
        userid,
        chatPartner,
      });
      await newChat.save();
  
      return res.status(201).json({
        message: "Chat created successfully",
        chat: newChat,
      });
    }

    
  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ message: "Server error creating chat" });
  }
});



const userSocketMap = {};
io.on("connection",(socket)=>{
  console.log("A user connected: " + socket.id);

  socket.on("chat messages",(msg)=>{
    console.log("Message received:", msg);
    // Broadcast the message to all connected clients except the sender
    //socket.broadcast.emit("chat messages", msg.text);
    //to all connected clients
    io.emit("chat messages", msg.text)
    
  })


  socket.on("register", (userId) => {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("private messages",async (data)=>{

    const { senderId, receiverId, chatId, text,createdAt } = data;
    console.log(data)
    const targetSocketId = userSocketMap[receiverId];
    if (targetSocketId) {
      // Emit the message to the intended recipient
      io.to(targetSocketId).emit("private messages", {
        senderId,
        text,
        receiverId,
        createdAt
      });
    }
    
    // Save the message to the database
    try {
      const newMessage = new Message({
        chatId,
        senderId,
        receiverId,
        text,
        
      });
      await newMessage.save();
      console.log("Message stored successfully.");
    } catch (error) {
      console.error("Error storing message:", error);
    }


  })

  socket.on("disconnect", () => {
    // Clean up mapping by finding which user disconnected
    for (const [userId, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });

})



server.listen(port, () => {
  connectDB();
  console.log(`Server is running on http://localhost:${port}`);
});