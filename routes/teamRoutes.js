const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Team = require('../models/Team');
const Player = require('../models/Player');
const { isAuthenticated } = require('./middleware/authMiddleware');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const { currentPlayer } = require('../utils/currentPlayer');

router.post('/create', isAuthenticated, async (req, res) => {
  const { name } = req.body;
  const members = Array.isArray(req.body.members) ? req.body.members : [];

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'A team name is required' });
  }
  if (members.some((id) => !isValidId(id))) {
    return res.status(400).json({ message: 'All member ids must be valid' });
  }

  try {
    const me = await currentPlayer(req);
    if (!me) {
      return res.status(403).json({ message: 'No player profile found for your account' });
    }

    // The creator is always a member, so the team is never left ownerless.
    const uniqueMembers = [...new Set([String(me._id), ...members.map(String)])];

    const newTeam = await Team.create({ name: name.trim(), members: uniqueMembers });
    console.log(`New team created: ${newTeam.name}`);
    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    console.error('Error creating team:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A team with that name already exists' });
    }
    res.status(500).json({ message: 'Failed to create team' });
  }
});

// Adding a member now requires that YOU are on the team.
// Previously any authenticated user could add any player to any team.
router.post('/:teamId/addMember', isAuthenticated, async (req, res) => {
  const { teamId } = req.params;
  const { memberId } = req.body;

  if (!isValidId(teamId) || !isValidId(memberId)) {
    return res.status(400).json({ message: 'Valid teamId and memberId are required' });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const me = await currentPlayer(req);
    if (!me || !team.members.some((id) => String(id) === String(me._id))) {
      console.warn(`User ${req.session.userId} tried to modify team ${teamId} without membership`);
      return res.status(403).json({ message: 'You must be a member of this team' });
    }

    const member = await Player.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Player not found' });
    }
    if (team.members.some((id) => String(id) === String(memberId))) {
      return res.status(409).json({ message: 'Member already in team' });
    }

    team.members.push(memberId);
    await team.save();
    console.log(`Member added to team: ${team.name}`);
    res.status(200).json({ message: 'Member added successfully', team });
  } catch (error) {
    console.error('Error adding member to team:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to add member to team' });
  }
});

module.exports = router;
