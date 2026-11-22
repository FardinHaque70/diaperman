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

## Put it online (to share on Messenger)

You need a free host that gives you a public link. Upload these files:
`index.html`, `manifest.webmanifest`, `icon.svg` and the `src/` folder.

**Easiest: Netlify Drop**
1. Go to https://app.netlify.com/drop and sign up (free).
2. Drag the `DiaperMan` folder onto the page.
3. You get a link like `https://something.netlify.app`. Rename it in
   *Site settings* to something nicer, e.g. `diaperman.netlify.app`.
4. To update the game later, drag the folder onto the site's *Deploys* tab again.

**Alternative: GitHub Pages**: push this folder to a GitHub repo, then
*Settings → Pages → Deploy from branch → main*. The link is
`https://<username>.github.io/<repo>/`.

**Alternative: itch.io**: zip the files, create a new HTML game project,
upload the zip and tick *"This file will be played in the browser"*.

## Nice link previews

Messenger shows a preview card for shared links. After hosting, take a
screenshot of the title screen, save it as `preview.png` in this folder, and
uncomment the `og:image` line in `index.html` with your full URL.

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
