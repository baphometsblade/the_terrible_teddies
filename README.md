# The Terrible Teddies

The Terrible Teddies is a strategic and humor-filled game that immerses players in a world of uniquely crafted teddy bear characters. With 50 individual teddies to collect and battle, each with its own set of attributes and backstories, players can engage in turn-based combat, manage their teddy collection, and progress through levels and challenges to become the ultimate teddy tactician.

## Overview

This project leverages Node.js and Express for the backend, with a MongoDB database to manage dynamic in-game content and player interactions. The frontend is rendered using EJS templates, while client-side interactions are handled with jQuery. The project is structured with models for user and teddy data, routes to facilitate game logic, and views for the user interface.

## Features

- 50 unique teddy bear characters, each with detailed attributes and backstories.
- A turn-based combat system for strategic gameplay.
- A card-based representation of teddies, featuring abilities and stats.
- Interfaces for teddy management and battle engagement.
- Persistent storage of characters and player progress in MongoDB.
- A scalable architecture with potential for future expansion and cross-platform play.

## Getting Started

### Requirements

- Node.js
- MongoDB
- npm for dependency management

### Quickstart

1. Clone the repository to your local machine.
2. Install the necessary npm packages with `npm install`.
3. Configure the `.env` file following the `.env.example` template.
4. Run the application using `npm start`, which will start the server and connect to the MongoDB database.

## Gameplay

To engage in battle:
1. Navigate to the Teddies page and select your lineup.
2. Proceed to the Battle Arena where you can choose to attack or use a special move.
3. Watch as the battle unfolds with real-time animations and updates.
4. Gain experience and level up your teddies as you win battles.

For a detailed guide on teddy attributes, battle strategies, and leveling up, refer to the in-game manual accessible from the dashboard.

## Documentation

For a comprehensive breakdown of the game's mechanics, character attributes, database schema, and API endpoints, please refer to the `docs` directory.

## Deployment

To deploy the game, follow the instructions provided in the `DEPLOYMENT.md` file, which includes steps for setting up the database and initializing the game environment.

## Contributing

We welcome contributions to The Terrible Teddies. If you have suggestions for new features or improvements, please open an issue or a pull request.

## License

Copyright (c) 2024.