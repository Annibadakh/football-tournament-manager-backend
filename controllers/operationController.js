
const MatchEvent = require('../models/matchEvent');

const createEvent = async (req, res) => {
  const { teamName, operationId } = req.body;
  if (!teamName || !operationId) return res.status(400).json({ error: 'Missing fields' });

  try {
    const newEvent = await MatchEvent.findOne();
    newEvent.teamName = teamName;
    newEvent.operationId = operationId;
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save event' });
  }
};
const getAllEvents = async (req, res) => {
  try {
    const events = await MatchEvent.findOne();
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

module.exports = {createEvent, getAllEvents};