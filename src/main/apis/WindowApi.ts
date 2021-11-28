import { shell, dialog, MessageBoxSyncOptions, ipcMain } from 'electron'; // deconstructing assignment

import { getResourceRootPath, getLoggerFilePath } from '../../config/config';
import path from 'path';
import fs from 'fs';

/**
 * WindowService 创建新窗口服务
 */
export class WindowApi {
  /**
   * createSubWindow 创建新的子窗口
   * @param event 事件源
   * @param arg 窗口选项
   */
  createSubWindow(
    event: any,
    arg: {
      height: number;
      width: number;
      titleBarStyle: string;
      nodeIntegration: boolean;
      contextIsolation: boolean;
      html: string;
    }
  ) {
    event.sender.send('createSubWindow', arg);
  }
  openResourceDir() {
    console.log(`openResourceDir ${getResourceRootPath()}`);
    shell.openPath(getResourceRootPath()); // Open the given file in the desktop's default manner.
  }
  openDictResourceDir(dictid: string) {
    const fpath = path.resolve(getResourceRootPath(), dictid);
    if (!fs.existsSync(fpath)) {
      fs.mkdirSync(fpath)
    }
    shell.openPath(fpath); // Open the given file in the desktop's default manner.
    return true;
  }
  openMainProcessLog() {
    console.log(`openMainProcessLog ${getLoggerFilePath()}`);
    const logpath = getLoggerFilePath();
    if (fs.existsSync(logpath)) {
      shell.openPath(logpath); // Open the given file in the desktop's default manner.
    }
  }
  openUrlOnBrowser(event: any, url: string) {
    console.log(`openurl ${url}`);
    if (url && url.length > 0 && url.startsWith('https://')) {
      shell.openExternal(url);
    }
  }
  openExternalURL(url: string) {
    console.log(`openurl ${url}`);
    if (url && url.length > 0 && url.startsWith('https://')) {
      shell.openExternal(url);
    }
  }
  syncShowComfirmMessageBox(args: MessageBoxSyncOptions) {
    console.log('showComfirmMessageBox args: ');
    console.log(args);
    return dialog.showMessageBoxSync(args);
  }
}
