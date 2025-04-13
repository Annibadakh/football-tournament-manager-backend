require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboard");
const tournamentRoutes = require("./routes/tournamentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const playerRoutes = require("./routes/playerRoutes");
const matchRoutes = require("./routes/matchesRoutes");
const operationRoutes = require('./routes/operationRoutes');

const path = require("path");

const PORT = process.env.PORT || 6000;

const app = express();
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store images in the uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file with timestamp
  },
});
const upload = multer({ storage: storage });
app.post("/api/upload-photo", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/tournament", tournamentRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/player", playerRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/operations', operationRoutes);


app.get('/', (req, res) => {
  res.send("from server side");
});



app.listen(PORT, async () => {
    try {
      await sequelize.authenticate();
      console.log(`Server running on http://localhost:${PORT}`);
    } catch (error) {
      console.error("Unable to connect to DB:", error);
    }
  });