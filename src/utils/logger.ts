/* Simple structured logger. Same shape as the calendar app's logger so
   anything copied over slots in directly. */

const fmt = (level: string, args: any[]) => {
  const ts = new Date().toISOString().slice(11, 19);
  return [`[${ts}] [${level}]`, ...args];
};

export const logger = {
  debug: (...args: any[]) => __DEV__ && console.log(...fmt('DEBUG', args)),
  info:  (...args: any[]) => console.log(...fmt('INFO', args)),
  warn:  (...args: any[]) => console.warn(...fmt('WARN', args)),
  error: (...args: any[]) => console.error(...fmt('ERROR', args)),

  api: (method: string, url: string, body?: any) =>
    __DEV__ && console.log(`🌐 ${method.toUpperCase()} ${url}`, body || ''),
  apiResponse: (status: number, url: string, body?: any) =>
    __DEV__ && console.log(`✅ ${status} ${url}`, body || ''),
  auth: (event: string, data?: any) =>
    __DEV__ && console.log(`🔐 ${event}`, data || ''),
};
