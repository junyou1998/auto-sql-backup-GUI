const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

// 確保臨時檔案目錄存在
const tempDir = app.getPath('temp');
const appTempDir = path.join(tempDir, 'mysql-backup');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 處理資料庫備份請求
ipcMain.on('start-backup', async (event, { dbName, localConfig, remoteConfig, recreateDb, keepBackup }) => {
  try {
    // 確保臨時目錄存在
    if (!fs.existsSync(appTempDir)) {
      fs.mkdirSync(appTempDir, { recursive: true });
    }

    // 寫入配置文件到臨時目錄
    const localCnfPath = path.join(appTempDir, '.local.cnf');
    const remoteCnfPath = path.join(appTempDir, '.remote.cnf');
    const dbConfigPath = path.join(appTempDir, 'db-name-config.sh');
    const backupScriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'sql-backup-script.sh')
      : path.join(app.getAppPath(), 'sql-backup-script.sh');

    fs.writeFileSync(localCnfPath, localConfig);
    fs.writeFileSync(remoteCnfPath, remoteConfig);
    fs.writeFileSync(dbConfigPath, `DB_NAME='${dbName}'`);

    // 設定檔案權限
    fs.chmodSync(localCnfPath, '600');
    fs.chmodSync(remoteCnfPath, '600');
    fs.chmodSync(dbConfigPath, '600');
    fs.chmodSync(backupScriptPath, '755');

    // 執行備份腳本
    const backupProcess = exec(`bash "${backupScriptPath}"`, {
      cwd: appTempDir,
      env: { 
        ...process.env, 
        PATH: process.env.PATH + ':/opt/homebrew/opt/mysql-client/bin',
        RECREATE_DB: recreateDb,
        KEEP_BACKUP: keepBackup
      }
    });

    backupProcess.stdout.on('data', (data) => {
      event.reply('backup-progress', { message: data });
    });

    backupProcess.stderr.on('data', (data) => {
      event.reply('backup-error', { error: data });
    });

    backupProcess.on('close', (code) => {
      if (code === 0) {
        event.reply('backup-complete', { success: true, canDownload: keepBackup === 'y' });
      } else {
        event.reply('backup-complete', { success: false, canDownload: false });
      }

      // 清理配置文件
      fs.unlinkSync(localCnfPath);
      fs.unlinkSync(remoteCnfPath);
      fs.unlinkSync(dbConfigPath);
      
      // 如果不保留備份，清理備份檔案
      if (keepBackup === 'n') {
        const backupFilePath = path.join(appTempDir, 'sql-backup.sql');
        if (fs.existsSync(backupFilePath)) {
          fs.unlinkSync(backupFilePath);
        }
      }
    });
  } catch (error) {
    event.reply('backup-error', { error: error.message });
  }
});

ipcMain.on('get-backup-path', (event) => {
  const backupFilePath = path.join(appTempDir, 'sql-backup.sql');
  if (fs.existsSync(backupFilePath)) {
    event.reply('backup-path', { filePath: backupFilePath });
  } else {
    event.reply('backup-error', { error: '備份檔案不存在' });
  }
});
