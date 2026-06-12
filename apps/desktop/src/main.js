import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, shell } from 'electron';
import { createApp } from '@ai-architecture-reviewer/api/src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let apiServer;
let mainWindow;

function getWebIndexPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'web', 'index.html');
  }

  return path.resolve(__dirname, '../../web/dist/index.html');
}

async function startLocalApi() {
  const storageDir = path.join(app.getPath('userData'), 'storage');
  const expressApp = createApp({ storageDir });

  return new Promise((resolve, reject) => {
    apiServer = expressApp.listen(0, '127.0.0.1');
    apiServer.once('listening', () => {
      const address = apiServer.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
    apiServer.once('error', reject);
  });
}

async function createMainWindow() {
  const apiBaseUrl = await startLocalApi();
  const webUrlParams = { aarApiBaseUrl: apiBaseUrl };
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: 'AI Architecture Reviewer',
    backgroundColor: '#f6f8fb',
    webPreferences: {
      additionalArguments: [`--aar-api-base-url=${apiBaseUrl}`],
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.AAR_DESKTOP_DEV_SERVER) {
    const devUrl = new URL(process.env.AAR_DESKTOP_DEV_SERVER);
    devUrl.searchParams.set('aarApiBaseUrl', apiBaseUrl);
    await mainWindow.loadURL(devUrl.toString());
  } else {
    await mainWindow.loadFile(getWebIndexPath(), {
      query: webUrlParams
    });
  }
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', () => {
  apiServer?.close();
});
