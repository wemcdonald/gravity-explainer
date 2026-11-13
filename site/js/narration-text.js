// Turns the HTML shown on screen into the plain words to say out loud.
// Pure (no DOM) because both the browser and tools/narrate.mjs use it: the
// plain text is the key that links a line to its pre-recorded audio file.
export function plain(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/m\/s²/g, 'meters per second squared')
    .replace(/km\/s/g, 'kilometers per second')
    .replace(/×/g, ' times ')
    .replace(/\s+/g, ' ')
    .trim();
}
