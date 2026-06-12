import { contextBridge } from 'electron';

const apiArg = process.argv.find((arg) => arg.startsWith('--aar-api-base-url='));
const apiBaseUrl = apiArg?.split('=').slice(1).join('=');

contextBridge.exposeInMainWorld('desktopConfig', {
  apiBaseUrl
});
