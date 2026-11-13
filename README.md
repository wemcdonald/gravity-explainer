# Gravity Quest

A fun, interactive web app that teaches gravity in levels, from "things fall" to
Newton, orbits, Einstein's bent space, black holes and gravitational waves. Built
for a curious 10-year-old who loves space: every idea is something to play with,
not something to read.

Live at https://gravity.willflix.org

## The eight missions

| # | Mission | The idea | What you do |
|---|---------|----------|-------------|
| 1 | Drop Zone | Everything falls at the same rate without air | Predict, then drop things on Earth, in a vacuum chamber and on the Moon |
| 2 | Planet Hopper | More mass means more gravity; weight is not mass | Jump on six worlds; sort worlds by your weight there |
| 3 | Newton's Pull | Everything pulls on everything; the inverse-square law | Pull-strength challenges; grow a planet from a dust cloud |
| 4 | Newton's Cannon | An orbit is falling and always missing | Fire a cannonball into orbit, a perfect circle, and escape |
| 5 | Slingshot | Gravity assists | A six-stage game: steer a probe using only planets' gravity |
| 6 | Bendy Space | Einstein: mass bends space, and light follows | Flick marbles on a rubber sheet; bend starlight into a telescope |
| 7 | Black Holes | Escape speed faster than light; time slows down | Squish Earth into a black hole; fly a ship near the event horizon |
| 8 | Ripples & Mysteries | Gravitational waves; what nobody knows yet | Collide black holes and hear the chirp; open the unsolved cases |

Each mission has three stars (two for playing, one for a short quiz). Progress,
the player's name and sound settings are saved in the browser only. Collect all
24 stars for a printable certificate.

Sound effects and music are synthesised in the browser (Web Audio), and the
read-aloud button uses the browser's built-in voices, so there are no audio
files and no accounts or tracking.

## Narration

Newt's intros and every quiz question, answer and explanation can be read aloud.
Lines with a pre-recorded file in `site/audio/` play that; anything else falls
back to the browser's built-in voice.

Recordings are made once, on a developer machine, by `tools/narrate.mjs`, so the
text-to-speech API key is never sent to the browser:

```sh
echo 'ELEVENLABS_API_KEY=...' > .env   # or OPENAI_API_KEY=...; .env is git-ignored
npm run narrate                        # records missing lines, removes stale ones
npm run narrate -- --check             # exits 1 if any line lacks a recording
```

Re-run it after changing any narrated text. Use `--redo` after changing the voice.

## Run it

It is a static site with no build step:

```sh
npm run serve        # http://localhost:8377
```

## Test it

```sh
npm install          # playwright-core, used only by the browser tests
npm test
```

- `tests/physics.test.mjs`: the numbers the app teaches match real physics
  (fall times, jump heights, orbital and escape speeds, black-hole sizes).
- `tests/slingshot-solver.mjs`: brute-forces every Slingshot stage to prove it
  can be won, and that it cannot be won with gravity switched off.
- `tests/smoke.mjs`: opens every part of every mission in headless Chrome and
  fails on any error.
- `tests/play.mjs`: plays each mission in headless Chrome and checks the stars
  are actually earned.

The browser tests need Google Chrome installed.

## Layout

```
site/                 everything that is served
  index.html, css/
  js/main.js          welcome screen, mission map, level pages, quiz
  js/ui.js            DOM/canvas helpers, confetti, Newt the mascot
  js/audio.js         synthesised sound effects and music
  js/speech.js        read-aloud
  js/store.js         saved progress
  js/slingshot-core.js  pure physics + stage data for the Slingshot game
  js/levels/*.js      one file per mission
tests/
```

## Deployment

Served by an `nginx:alpine` container on the willflix server, which bind-mounts
`site/` read-only, behind Traefik. `git pull` in the checkout is a deploy.
