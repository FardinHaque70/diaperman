# DiaperMan

A tiny mobile-first browser runner made with [Phaser 3](https://phaser.io).
Tap to jump, tap again in the air to double jump, dodge toy blocks, rubber
ducks and bees, and grab milk bottles for +5.

There is no build step: it's plain HTML + JavaScript, and all the art and
sound are generated in code.

## Run it on your computer

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. To try it on your phone, connect it to the
same Wi-Fi and open `http://<your-mac's-ip>:8080`.

## Play it / share it

Live at **https://fardinhaque70.github.io/diaperman/** (GitHub Pages).

To publish changes, commit and push to `main`. A GitHub workflow
(`.github/workflows/pages.yml`) packs the whole game into one page with
`scripts/build.mjs` and publishes it, usually within a minute:

```bash
git add -A && git commit -m "Update game" && git push
```

Packing everything into one page means phones always get a complete version
(old or new) even while their browser cache catches up, never a broken mix.
To try the packed build locally: `npm install --no-save esbuild@0.24.0 && node scripts/build.mjs`,
then serve the `dist/` folder.

## Fast loading

- A loading screen built into the page shows instantly, with a real progress
  bar while the game engine downloads.
- The engine is a slim custom Phaser build with only what DiaperMan uses
  (`vendor/phaser-diaperman-3.80.1.min.js`, ~35% smaller). Rebuild it with
  `npm install --no-save --no-package-lock esbuild@0.24.0 phaser@3.80.1 && node scripts/build-phaser.mjs`
  if the game starts using a Phaser feature that isn't included.
- After the first visit a service worker (`sw.js`) keeps a copy on the phone,
  so later launches are instant; new versions show up on the next launch.

## Link previews

`preview.png` (1200×630) is the picture Messenger/WhatsApp show when the link
is shared; it's set by the `og:image` tags in `index.html`.

## Online leaderboard (Firebase, free)

The game works without it. To turn it on (about 5 minutes):

1. Go to https://console.firebase.google.com and **Create a project**
   (any name, e.g. `diaperman`; Google Analytics can be turned off).
2. **Build → Authentication → Get started → Sign-in method → Anonymous →
   Enable → Save.** (Players never see a login; this just gives each phone
   an id so nobody can change someone else's score.)
3. **Build → Firestore Database → Create database.** Pick a location near
   you, choose **production mode**, and create it.
4. In Firestore, open the **Rules** tab, replace everything with the
   contents of [`firestore.rules`](firestore.rules), and press **Publish**.
5. **Project settings (gear icon) → General → Your apps → Web (`</>`)**.
   Register an app (no Firebase Hosting needed). Copy the `firebaseConfig`
   values (`apiKey`, `authDomain`, `projectId`, `appId`) into
   `FIREBASE_CONFIG` in `src/config.js`.

These config values are meant to be public; the rules protect the data.

How it works: after their first run, each player types a name once (they
can change it from the leaderboard screen). Every game over saves their
best score and shows their rank; the 🏆 button shows the top 10.

## Tweaking

- `src/config.js`: jump strength, gravity, speed.
- `src/art.js`: how every character and object is drawn.
- `src/scenes/GameScene.js`: obstacles, spawning, scoring.
