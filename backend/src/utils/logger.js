const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, ...args) => console.log(`[INFO]  ${getTimestamp()} - ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN]  ${getTimestamp()} - ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${getTimestamp()} - ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${getTimestamp()} - ${msg}`, ...args);
    }
  },
};
