# The Terrible Teddies

The Terrible Teddies is an elaborate and interactive game that features a rich narrative, strategic depth, and humor. It encompasses a universe of 50 uniquely crafted teddy bear characters, each with its own set of attributes that contribute to the gameplay. Players engage in turn-based combat, manage their teddy collection, and progress through various levels and challenges.

## Overview

This game leverages a robust backend built with Node.js and Express, with a MongoDB database for storing character data and game states. The frontend is rendered using EJS templates, with client-side interactions handled by jQuery. The project's structure includes models for user and teddy data, routes for game logic, and views for the user interface.

## Features

- 50 unique teddy bear characters with individual attributes and backstories.
- Turn-based combat system allowing for strategic gameplay.
- Card-based representation of teddies with abilities and stats.
- User interface for teddy management and battle engagement.
- Persistent database storage for characters and player progress.
- Scalable game mechanics and the potential for future expansion.

## Getting Started

### Requirements

- Node.js
- MongoDB
- npm for managing dependencies

### Quickstart

1. Clone the repository to your local machine.
2. Install the required npm packages using `npm install`.
3. Create a `.env` file based on the `.env.example` template with the appropriate MongoDB URL and session secret.
4. Run the game using `npm start`, which will launch the server and connect to the database.

### License

Copyright (c) 2024.