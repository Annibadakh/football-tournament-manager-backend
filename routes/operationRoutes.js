const express = require('express');
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();
const { createEvent, getAllEvents } = require('../controllers/operationController');

router.post('/add', authenticate(["admin", "scorer"]), createEvent);
router.get('/get', getAllEvents);

module.exports = router;
