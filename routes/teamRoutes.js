const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Player = require('../models/Player');
const combinedAuthMiddleware = require('../middleware/combinedAuthMiddleware');

// Route to display the form for creating a new team
router.get('/create', combinedAuthMiddleware, (req, res) => {
  res.render('createTeam');
});

// Route to create a new team
router.post('/create', combinedAuthMiddleware, async (req, res) => {
  const { name, members } = req.body;
  try {
    const newTeam = new Team({ name, members });
    await newTeam.save();
    console.log(`Team created successfully: ${newTeam.name}`);
    res.status(200).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    console.error('Error creating team:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to create team', error: error.message });
  }
});

// Route to add a member to a team
router.post('/:teamId/addMember', combinedAuthMiddleware, async (req, res) => {
  const { teamId } = req.params;
  const { memberId } = req.body;
  
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      console.log('Team not found');
      return res.status(404).json({ message: 'Team not found' });
    }
    
    if (!team.members.includes(memberId)) {
      team.members.push(memberId);
      await team.save();
      console.log(`Member added successfully to team: ${team.name}`);
    }
    res.status(200).json({ message: 'Member added successfully', team });
  } catch (error) {
    console.error('Error adding member to team:', error.message, error.stack);
    res.status(500).json({ message: 'Failed to add member to team', error: error.message });
  }
});

module.exports = router;