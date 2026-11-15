const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function write(stream, level, args) {
  stream(`[${stamp()}] ${level.padEnd(5)}`, ...args);
}

module.exports = {
  info: (...args) => write(console.log, 'INFO', args),
  warn: (...args) => write(console.warn, 'WARN', args),
  error: (...args) => write(console.error, 'ERROR', args)
};
