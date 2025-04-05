const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

// Register Route
router.post("/register", async (req, res) => {
  const { name, email, password, role, contactNum } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({ name, email, password: hashedPassword, role, contactNum });
    let pass = null;
    if(newUser.role == "counsellor"){
      pass = email;
    }

    // const text = `${newUser.role.toUpperCase()} Register Successfully !!`;
    // await sendMail(email, `${newUser.role.toUpperCase()} Register Successfully !!`, text , htmlContent);
    
    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found !!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials !!" });

    if(role !== user.role){
      return res.status(403).json({ message: "User role not match !!" });
    };
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: "30m" });
    res.status(200).json({ token, role: user.role, email: user.email, uuid: user.uuid, userName: user.name });
  } catch (error) {
    res.status(500).json({ message: "Server error !!", error });
  }
});

module.exports = router;
