import { createApp } from './app.js';

const port = Number(process.env.PORT || 8080);
const storageDir = process.env.STORAGE_DIR || 'storage';

createApp({ storageDir }).listen(port, () => {
  process.stdout.write(`AI Architecture Reviewer API listening on http://127.0.0.1:${port}\n`);
});
