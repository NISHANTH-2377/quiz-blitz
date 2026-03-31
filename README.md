# Quiz Blitz

A real-time Kahoot-style quiz game with host monitoring and multi-device play.

## Features

- Host a live quiz from one device
- Join from multiple devices using a shared game PIN
- Host monitors all connected players in real time
- Players answer questions while the host observes scores and progress
- Final scoreboard updates for everyone

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your browser.

## How it works

- The host opens the site and creates a quiz.
- The host starts hosting and receives a 4-digit PIN.
- Players connect from different devices using the same URL and enter the PIN.
- The host monitors the lobby, starts the quiz, and watches live score updates.

## Notes

This project uses a Node.js backend with WebSockets to support multi-device gameplay across networked clients.
