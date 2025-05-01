import express from 'express';
import User from './models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import Message from './models/messagemodel.js';
import Chat from './models/mychatsmodel.js';
import Group from './models/groupmodel.js';
import Groupmessage from "./models/groupchatmodel.js"
//import cookieParser from "cookie-parser";


import http from 'http';
dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors()
);;
const port = process.env.PORT || 3002;
//const dbURI = process.env.DB_URI;
const JWT_SECRET = "zoom";


import mongoose from 'mongoose';
import { channel } from 'diagnostics_channel';

const dbURI = 'mongodb+srv://bhanuylm01:bhanuylm@cluster-chat.sws0r.mongodb.net/?retryWrites=true&w=majority';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
   
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



// 🔹 Utility function to generate a JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
};

app.post("/api/login", async (req, res) => {
  console.log("jjj")
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

 
  

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, profilePic: user.profilePic },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

// 🔹 Logout Route (Fixed CORS & Cookies)
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true, // Ensure this is `false` for local development without HTTPS
    sameSite: "lax",
  });

  res.status(200).json({ message: "Logged out successfully" });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, profilePic } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, profilePic: profilePic || "" });
    await newUser.save();

    const token = generateToken(newUser._id);

    // ✅ Secure cookie settings
   
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: newUser._id, name, email, profilePic: newUser.profilePic },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
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
app.post("/addtomychats", async (req, res) => {
  let { user, chatPartner, chatid } = req.body;
  console.log(chatid)

  if (!user || !chatPartner || !chatPartner._id || !chatid) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    // 🔍 Check if chat already exists
    let chat = await Chat.findOne({ chatid });

    if (!chat) {
      // Create a new chat only if it does not exist
      chat = new Chat({
        chatid,
        participants: [
          { _id: user.id, name: user.name, email: user.email, profilePic: user.profilePic },
          { _id: chatPartner._id, name: chatPartner.name, email: chatPartner.email, profilePic: chatPartner.profilePic }
        ]
      });
      await chat.save();
      return res.status(201).json({ message: "Chat created successfully", chat });
    }

    return res.send({ message: "Chat already exists", chat });


  } catch (error) {
    console.error("Error creating chat:", error);
    return res.status(500).json({ message: "Server error creating chat" });
  }

 
});







app.get("/mychats/:userid", async (req, res) => {
  const { userid } = req.params;
  console.log(userid)

  try {
    // 🔍 Find chats where the user is a participant
    const chats = await Chat.find({ "participants._id": userid });

    // Extract and send only the other participant's details
    const otherParticipants = chats.map(chat => 
      chat.participants.find(participant => participant._id !== userid)
    );

    return res.status(200).json(otherParticipants);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return res.status(500).json({ message: "Server error fetching chats" });
  }
});






app.post('/creategroup', async (req, res) => {
  console.log(req.body)
  try {
    const { name, members, admin } = req.body;

    if (!name || !members || !admin) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Ensure admin is included in the members array
if (!members.includes(admin)) {
  members.push(admin);
}


    // Create the group
    const newGroup = new Group({
      name,
      members,
      admin
    });

    const savedGroup = await newGroup.save();

    // OPTIONAL: Add this group to each user's group array
    await User.updateMany(
      { _id: { $in: members } },
      { $addToSet: { groups: savedGroup._id } } // ensure no duplicates
    );

    res.status(201).json(savedGroup);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /user/:userId/groups


app.get('/getgroups/:userId', async (req, res) => {
  console.log("abc")
  try {
    const groups = await Group.find({
      members: req.params.userId
    }).populate('admin', 'name email'); // optional: show admin info
    console.log(groups)

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET details of a single group
app.get('/getgroupdetails/:groupId', async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// api to get grouo messags based on group id
app.get("/group-messages/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const messages = await Groupmessage.find({ groupId }).populate('senderId', 'name').sort({ createdAt: 1 }); // ascending by time
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});










const userSocketMap = {};
io.on("connection",(socket)=>{
  console.log("A user connected: " + socket.id);


   

  socket.on("joinGroup", async (groupId) => {
    socket.join(groupId);
    console.log(`User joined group ${groupId}`);

   
  });

  socket.on("groupMessage", async ({ groupId, senderId, text }) => {
    try {
      const message = new Groupmessage({ groupId, senderId, text });
      await message.save();
      const populatedMessage = await Groupmessage.findById(message._id)
  .populate('senderId', 'name');


      console.log("Saved & populated message:", populatedMessage);
  
      io.to(groupId).emit("groupMessage", populatedMessage);
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  });
  

  


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



server.listen(port,() => {
  connectDB();
  console.log(`Server is running on http://localhost:${port}`);
});




const users = [
  { name: "John Doe", email: "johndoe@example.com", password: "$2a$10$wI3E2F4K5L6M7N8O9P0Q" },
  { name: "Jane Smith", email: "janesmith@example.com", password: "$2a$10$A1B2C3D4E5F6G7H8I9J0" },
  { name: "Alice Johnson", email: "alicejohnson@example.com", password: "$2a$10$K9L8M7N6O5P4Q3R2S1T" },
  { name: "Bob Brown", email: "bobbrown@example.com", password: "$2a$10$U1V2W3X4Y5Z6A7B8C9D" },
  { name: "Charlie Davis", email: "charliedavis@example.com", password: "$2a$10$E1F2G3H4I5J6K7L8M9N" },
  { name: "David Wilson", email: "davidwilson@example.com", password: "$2a$10$O1P2Q3R4S5T6U7V8W9X" },
  { name: "Emma Thomas", email: "emmathomas@example.com", password: "$2a$10$Y1Z2A3B4C5D6E7F8G9H" },
  { name: "Frank Garcia", email: "frankgarcia@example.com", password: "$2a$10$I1J2K3L4M5N6O7P8Q9R" },
  { name: "Grace Lee", email: "gracelee@example.com", password: "$2a$10$S1T2U3V4W5X6Y7Z8A9B" },
  { name: "Henry Martinez", email: "henrymartinez@example.com", password: "$2a$10$C1D2E3F4G5H6I7J8K9L" },
  { name: "Isabella Lopez", email: "isabellalopez@example.com", password: "$2a$10$M1N2O3P4Q5R6S7T8U9V" },
  { name: "Jack White", email: "jackwhite@example.com", password: "$2a$10$W1X2Y3Z4A5B6C7D8E9F" },
  { name: "Kelly Harris", email: "kellyharris@example.com", password: "$2a$10$G1H2I3J4K5L6M7N8O9P" },
  { name: "Liam Clark", email: "liamclark@example.com", password: "$2a$10$Q1R2S3T4U5V6W7X8Y9Z" },
  { name: "Mia Rodriguez", email: "miarodriguez@example.com", password: "$2a$10$A1B2C3D4E5F6G7H8I9J" },
  { name: "Nathan Lewis", email: "nathanlewis@example.com", password: "$2a$10$K1L2M3N4O5P6Q7R8S9T" },
  { name: "Olivia Walker", email: "oliviawalker@example.com", password: "$2a$10$U1V2W3X4Y5Z6A7B8C9D" },
  { name: "Peter Allen", email: "peterallen@example.com", password: "$2a$10$E1F2G3H4I5J6K7L8M9N" },
  { name: "Quinn Young", email: "quinnyoung@example.com", password: "$2a$10$O1P2Q3R4S5T6U7V8W9X" },
  { name: "Ryan King", email: "ryanking@example.com", password: "$2a$10$Y1Z2A3B4C5D6E7F8G9H" },
  { name: "Sophia Scott", email: "sophiascott@example.com", password: "$2a$10$I1J2K3L4M5N6O7P8Q9R" },
  { name: "Tyler Green", email: "tylergreen@example.com", password: "$2a$10$S1T2U3V4W5X6Y7Z8A9B" },
  { name: "Uma Adams", email: "umaadams@example.com", password: "$2a$10$C1D2E3F4G5H6I7J8K9L" },
  { name: "Victor Nelson", email: "victornelson@example.com", password: "$2a$10$M1N2O3P4Q5R6S7T8U9V" },
  { name: "Wendy Carter", email: "wendycarter@example.com", password: "$2a$10$W1X2Y3Z4A5B6C7D8E9F" },
];


