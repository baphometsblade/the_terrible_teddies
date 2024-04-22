const express = require('express');
const router = express.Router();
const Team = require('../../models/Team');
const Player = require('../../models/Player');
const { ensureAuthenticated } = require('../../middleware/authMiddleware');

// Route to create a new team
router.post('/create', ensureAuthenticated, async (req, res) => {
  const { teamName } = req.body;
  try {
    const newTeam = new Team({
      name: teamName,
      members: [req.session.userId] // Creator is the first member
    });
    await newTeam.save();
    console.log(`New team created: ${newTeam.name}`);
    res.status(201).send({ message: 'Team created successfully', teamId: newTeam._id });
  } catch (error) {
    console.error(`Error creating team: ${error.message}`, error.stack);
    res.status(500).send({ message: 'Failed to create team' });
  }
});

// Route to add a member to a team
router.post('/add-member', ensureAuthenticated, async (req, res) => {
  const { teamId, memberId } = req.body;
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      console.log('Team not found');
      return res.status(404).send({ message: 'Team not found' });
    }
    const player = await Player.findById(memberId);
    if (!player) {
      console.log('Player not found');
      return res.status(404).send({ message: 'Player not found' });
    }
    if (team.members.includes(memberId)) {
      console.log('Member already in team');
      return res.status(400).send({ message: 'Member already in team' });
    }
    team.members.push(memberId);
    await team.save();
    console.log(`Member added to team: ${team.name}`);
    res.status(200).send({ message: 'Member added successfully' });
  } catch (error) {
    console.error(`Error adding member to team: ${error.message}`, error.stack);
    res.status(500).send({ message: 'Failed to add member to team' });
  }
});

module.exports = router;