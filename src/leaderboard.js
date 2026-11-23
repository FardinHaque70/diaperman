// Player name + online leaderboard (Firebase: anonymous sign-in + Firestore).
// Firebase is only downloaded when FIREBASE_CONFIG is filled in.
import { FIREBASE_CONFIG } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const NAME_KEY = 'diaperman.name';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export const leaderboardEnabled = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

// Letters, numbers, spaces and a few symbols; max 16 characters.
export function cleanName(s) {
  return String(s || '')
    .replace(/[^\p{L}\p{N} _.'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

export function getName() { return store.get(NAME_KEY) || ''; }
export function setName(n) {
  const clean = cleanName(n);
  if (clean) store.set(NAME_KEY, clean);
  return clean;
}

// ---------------------------------------------------------------- Firebase
let ready = null; // Promise<{ fs, db, uid }>

function connect() {
  if (!ready) {
    ready = (async () => {
      const [{ initializeApp }, auth, fs] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const a = auth.getAuth(app);
      // Silent anonymous sign-in: gives each phone an id, so players
      // can only change their own score. No account or password.
      const cred = a.currentUser ? { user: a.currentUser } : await auth.signInAnonymously(a);
      return { fs, db: fs.getFirestore(app), uid: cred.user.uid };
    })().catch((err) => {
      ready = null; // try again next time
      throw err;
    });
  }
  return ready;
}

function withTimeout(promise, ms = 8000) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// Saves the player's best (never lowers it). Returns their rank, or null.
export async function submitScore(score) {
  const name = getName();
  if (!leaderboardEnabled() || !name) return null;
  try {
    return await withTimeout((async () => {
      const { fs, db, uid } = await connect();
      const ref = fs.doc(db, 'scores', uid);
      const snap = await fs.getDoc(ref);
      const best = Math.max(Math.floor(score), snap.exists() ? snap.data().best : 0);
      await fs.setDoc(ref, { name, best, updatedAt: fs.serverTimestamp() });
      const higher = await fs.getCountFromServer(fs.query(fs.collection(db, 'scores'), fs.where('best', '>', best)));
      return higher.data().count + 1;
    })());
  } catch (err) {
    console.warn('Leaderboard submit failed', err);
    return null;
  }
}

// ---------------------------------------------------------------- top scores (cached)
// The top 10 is kept in memory and on the phone, so screens can show it
// instantly and refresh it quietly in the background.
const TOP_KEY = 'diaperman.top';
let top = null;      // [{ name, best, me }]
let topAt = 0;       // when it was last fetched
let topLoading = null;

try { top = JSON.parse(store.get(TOP_KEY) || 'null'); } catch { top = null; }

// Last known top players (possibly a little old), or null if never loaded.
export function cachedTop(limit = 10) {
  return top ? top.slice(0, limit) : null;
}

// Fresh top players: [{ name, best, me }], or null if it couldn't load.
export async function fetchTop(limit = 10) {
  if (!leaderboardEnabled()) return null;
  if (!topLoading) {
    topLoading = withTimeout((async () => {
      const { fs, db, uid } = await connect();
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'scores'), fs.orderBy('best', 'desc'), fs.limit(10)));
      top = snap.docs.map((d) => ({ name: d.data().name, best: d.data().best, me: d.id === uid }));
      topAt = Date.now();
      store.set(TOP_KEY, JSON.stringify(top));
      return top;
    })()).catch((err) => {
      console.warn('Leaderboard load failed', err);
      return null;
    }).finally(() => { topLoading = null; });
  }
  const list = await topLoading;
  return list ? list.slice(0, limit) : null;
}

// Connect and load the top 10 in the background (e.g. while on the menu),
// so the leaderboard and end screen don't have to wait later.
export function warmUp() {
  if (!leaderboardEnabled() || Date.now() - topAt < 20000) return;
  fetchTop(10);
}

// ---------------------------------------------------------------- name box
// A real text field so the phone keyboard works.
export function askName(scene, { title = 'Nice run! Enter your name for the leaderboard', current = '' } = {}) {
  return new Promise((resolve) => {
    const wrap = document.getElementById('name-overlay');
    const form = document.getElementById('name-form');
    const input = document.getElementById('name-input');
    document.getElementById('name-title').textContent = title;
    input.value = current;
    input.classList.remove('shake');
    wrap.hidden = false;
    const kb = scene.input.keyboard;
    if (kb) kb.enabled = false; // so Space types a space instead of restarting

    const onSubmit = (e) => {
      e.preventDefault();
      const name = setName(input.value);
      if (!name) { // a name is required
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        input.focus();
        return;
      }
      input.blur();
      wrap.hidden = true;
      if (kb) kb.enabled = true;
      form.removeEventListener('submit', onSubmit);
      resolve(name);
    };
    form.addEventListener('submit', onSubmit);
  });
}
