// routes/payment.js

const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
require('dotenv').config();
const authenticate = require("../middleware/authMiddleware");


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /create-order
router.post('/create-order', authenticate(["admin", "superadmin"]), async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency,
      receipt: receipt || `rcptid_${Math.random().toString(36).substring(2, 10)}`,
      notes: notes || {},
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      receipt: receipt,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, error: 'Unable to create order' });
  }
});

module.exports = router;
