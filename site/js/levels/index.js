import drop from './drop.js';
import hop from './hop.js';
import pull from './pull.js';
import cannon from './cannon.js';
import slingshot from './slingshot.js';
import bendy from './bendy.js';
import blackhole from './blackhole.js';
import waves from './waves.js';

/** Missions in teaching order: each one builds on the idea before it. */
export const LEVELS = [drop, hop, pull, cannon, slingshot, bendy, blackhole, waves];

export const QUIZ_INTRO = 'Quiz time! No rush, and you can try again if you miss one.';
