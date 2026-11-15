// Loads every command and event file and validates the slash-command
// definitions, without logging in. Run with: npm run check
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src');
let failed = false;

for (const dir of ['commands', 'events']) {
  for (const file of fs.readdirSync(path.join(src, dir)).filter(f => f.endsWith('.js'))) {
    try {
      const mod = require(path.join(src, dir, file));
      if (dir === 'commands') {
        mod.data.toJSON(); // throws if a definition is invalid
        if (typeof mod.execute !== 'function') throw new Error('missing execute()');
      } else if (!mod.name || typeof mod.execute !== 'function') {
        throw new Error('missing name or execute()');
      }
      console.log(`ok   ${dir}/${file}`);
    } catch (err) {
      failed = true;
      console.error(`FAIL ${dir}/${file}: ${err.message}`);
    }
  }
}

process.exit(failed ? 1 : 0);
