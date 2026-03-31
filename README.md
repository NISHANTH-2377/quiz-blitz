# Quiz Blitz

A real-time Kahoot-style quiz game with host monitoring and multi-device play using Firebase Realtime Database.

## Features

- Host a quiz from one device
- Join from multiple devices using a shared game PIN
- Host monitors players in real time
- Players answer questions while the host observes scores and progress
- Final scoreboard updates for everyone

## Vercel deployment

This version works as a static frontend on Vercel.
You only need a Firebase Realtime Database to share game state across devices.

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database and set rules to allow reads/writes for testing.
3. Replace the placeholder Firebase config in `script.js` with your project values:
   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT.firebaseio.com",
     projectId: "YOUR_PROJECT",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
   };
   ```
4. Deploy the folder to Vercel as a static site.

## Run locally

You can also preview locally by serving the folder as static content.

## Notes

- The host does not answer questions; the host monitors players instead.
- Players join using the same app URL and a 4-digit PIN.
- For production, tighten your Firebase rules and protect your database.
