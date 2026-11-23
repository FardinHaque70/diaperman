# DiaperMan

A one-tap, mobile-first browser runner made with [Phaser 3](https://phaser.io).
An 8-month-old hero starts out naked and suits up one diaper piece at a time.
Tap to jump, tap again in the air to double jump (with a toothless "blub"),
dodge toy blocks, rubber ducks and bees, and grab milk bottles.

All art and sound are generated in code: there are no image or audio assets.

**Play:** https://fardinhaque70.github.io/diaperman/

## Project layout

```
index.html            Page, instant loading screen, engine loader
sw.js                 Service worker: keeps a copy on the phone for instant relaunches
manifest.webmanifest  Home-screen app info
icon.svg              App icon
preview.png           Link-preview image (Messenger, WhatsApp, ...)
firestore.rules       Leaderboard security rules (paste into Firebase)

src/
  main.js             Game setup (size, physics, scenes)
  config.js           All tuning: speed, difficulty, power-ups, events, Firebase keys
  art.js              Draws every character, item and background
  sfx.js              Synthesized sound effects
  leaderboard.js      Player name + Firebase leaderboard (cached)
  background.js       Scrolling sky, hills and ground
  ui.js               Buttons and camera helper
  fps.js              Optional frame-rate meter (?fps)
  scenes/
    MenuScene.js         Title screen
    GameScene.js         Gameplay, power-ups, events, end screen
    LeaderboardScene.js  Top 10 screen

scripts/
  build.mjs           Packs the game into dist/ (run by GitHub on every push)
  build-phaser.mjs    Builds the slim engine in vendor/
  phaser-custom.js    Which engine parts the slim build includes

vendor/
  phaser-diaperman-3.80.1.min.js   Slim Phaser engine (generated, committed)

.github/workflows/pages.yml        Build + publish to GitHub Pages on push
```

## Run it on your computer

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. To try it on your phone, connect it to the
same Wi-Fi and open `http://<your-mac's-ip>:8080`.

Handy link options: `?fps` shows a frame-rate meter, `?res=1` forces normal
(non-2×) drawing detail.

## Publish changes

Commit and push to `main`. The workflow packs the whole game into one page
with `scripts/build.mjs` and publishes it, usually within a minute:

```bash
git add -A && git commit -m "Update game" && git push
```

Packing everything into one page means phones always get a complete version
(old or new) even while their cache catches up, never a broken mix.

To try the packed build locally:

```bash
npm install --no-save --no-package-lock esbuild@0.24.0 && node scripts/build.mjs
```

then serve the `dist/` folder.

## How it stays fast and sharp

- The loading screen is plain HTML, so it shows instantly with a real progress
  bar while the engine downloads in the background.
- The engine is a slim custom Phaser build (~35% smaller). Rebuild it only if
  the game starts using a Phaser feature that isn't included:
  `npm install --no-save --no-package-lock esbuild@0.24.0 phaser@3.80.1 && node scripts/build-phaser.mjs`
- After the first visit, `sw.js` keeps a copy on the phone, so later launches
  are instant; new versions show up on the next launch.
- On high-density screens the game draws at 2× detail (camera zoom + art
  baked at 2×), so text and art are sharp. Hitboxes are the same either way.
- The game's height follows the screen's shape, so it fills any phone.

## Online leaderboard (Firebase, free)

Already set up for this project. To set it up for a new Firebase project:

1. Go to https://console.firebase.google.com and **Create a project**.
2. **Build → Authentication → Sign-in method → Anonymous → Enable.**
   (Players never see a login; it gives each phone an id so nobody can change
   someone else's score.)
3. **Build → Firestore Database → Create database** in **production mode**.
4. In Firestore's **Rules** tab, paste [`firestore.rules`](firestore.rules) and **Publish**.
5. **Project settings → Your apps → Web (`</>`)**: copy `apiKey`, `authDomain`,
   `projectId` and `appId` into `FIREBASE_CONFIG` in `src/config.js`.

These config values are meant to be public; the rules protect the data.

## Tweaking

- `src/config.js`: jump strength, gravity, speed, difficulty, power-up and event timing.
- `src/art.js`: how every character and object is drawn.
- `src/scenes/GameScene.js`: obstacles, spawning, scoring, events.
