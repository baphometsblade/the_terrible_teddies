# The Terrible Teddies

The Terrible Teddies is a dynamic, strategic, and humor-filled game that immerses players in a world of uniquely crafted teddy bear characters. Players engage in turn-based combat, manage their teddy collection, and progress through levels and challenges to become the ultimate teddy tactician. The game features 50 individual teddies, each with its own set of attributes and backstories, enriching the gameplay and narrative depth.

## Overview

This project leverages Node.js and Express for the backend, MongoDB for data persistence, and EJS templates for rendering the frontend. The architecture is designed for scalability and future expansion, including potential cross-platform play. The game's logic encompasses character development, combat mechanics, player interaction, and database integration for a seamless user experience.

## Features

- **Character Development:** 50 unique teddy bear characters with extensive backstories and attributes.
- **Game Mechanics:** Turn-based combat system, card-based teddy representation, and strategic gameplay.
- **Player Interaction:** Interfaces for teddy management, battle engagement, and social features.
- **Persistence:** MongoDB integration for storing game data, player progress, and dynamic content.
- **Scalability:** Architectured for future expansion and cross-platform accessibility.
- **Admin Panel:** A dedicated admin panel for managing teddies, including adding, editing, and removing teddies.
- **Pagination and Search:** Enhanced teddies collection view with pagination and search functionality for better user experience.
- **Favorites:** Users can save their favorite teddies for quick access.
- **Mobile-Responsive Design:** Improved UI for optimal viewing on mobile devices.
- **Form Validation:** Client-side and server-side validation for forms to improve data integrity.
- **Daily Challenges:** New daily challenges or missions that reward players with experience points or items.
- **Automated Testing:** Automated tests for key functionalities to ensure reliability.
- **Continuous Integration:** CI setup to run tests automatically on each push to the repository.
- **In-Game Chat:** Real-time chat feature for players to communicate during battles.
- **Battle History:** Feature for users to view a history of their battles.
- **Profile Setup:** New users can set up their player profile upon registration.

## Getting Started

### Requirements

- Node.js
- MongoDB
- npm

### Quickstart

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Configure `.env` as per `.env.example`. // INPUT_REQUIRED {DATABASE_URL and SESSION_SECRET}
4. Run `npm start` to launch the server and connect to MongoDB.

## Deployment

To deploy The Terrible Teddies, follow these steps:

1. Ensure all environment variables are set correctly in the `.env` file.
2. Use a process manager like PM2 for Node.js applications to keep the game running smoothly in a production environment.
3. Consider using a CDN for static assets to improve load times for users globally.
4. Regularly back up your MongoDB database to prevent data loss.

## Contributing

Contributions to The Terrible Teddies are welcome! Please refer to the CONTRIBUTING.md file for guidelines on how to contribute to this project.

## License

Copyright (c) 2024.