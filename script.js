const { ipcRenderer } = require("electron");

// 載入儲存的設定
function loadSavedSettings() {
    // 資料庫設定
    if (localStorage.getItem('rememberDb') === 'true') {
        document.getElementById('rememberDb').checked = true;
        document.getElementById('dbName').value = localStorage.getItem('dbName') || '';
    }

    // 遠端資料庫設定
    if (localStorage.getItem('rememberRemote') === 'true') {
        document.getElementById('rememberRemote').checked = true;
        document.getElementById('remoteUser').value = localStorage.getItem('remoteUser') || '';
        document.getElementById('remotePassword').value = localStorage.getItem('remotePassword') || '';
        document.getElementById('remoteHost').value = localStorage.getItem('remoteHost') || '';
    }

    // 本機資料庫設定
    if (localStorage.getItem('rememberLocal') === 'true') {
        document.getElementById('rememberLocal').checked = true;
        document.getElementById('localUser').value = localStorage.getItem('localUser') || '';
        document.getElementById('localPassword').value = localStorage.getItem('localPassword') || '';
    }
}

// 儲存設定
function saveSettings() {
    // 資料庫設定
    const rememberDb = document.getElementById('rememberDb').checked;
    localStorage.setItem('rememberDb', rememberDb);
    if (rememberDb) {
        localStorage.setItem('dbName', document.getElementById('dbName').value);
    } else {
        localStorage.removeItem('dbName');
    }

    // 遠端資料庫設定
    const rememberRemote = document.getElementById('rememberRemote').checked;
    localStorage.setItem('rememberRemote', rememberRemote);
    if (rememberRemote) {
        localStorage.setItem('remoteUser', document.getElementById('remoteUser').value);
        localStorage.setItem('remotePassword', document.getElementById('remotePassword').value);
        localStorage.setItem('remoteHost', document.getElementById('remoteHost').value);
    } else {
        localStorage.removeItem('remoteUser');
        localStorage.removeItem('remotePassword');
        localStorage.removeItem('remoteHost');
    }

    // 本機資料庫設定
    const rememberLocal = document.getElementById('rememberLocal').checked;
    localStorage.setItem('rememberLocal', rememberLocal);
    if (rememberLocal) {
        localStorage.setItem('localUser', document.getElementById('localUser').value);
        localStorage.setItem('localPassword', document.getElementById('localPassword').value);
    } else {
        localStorage.removeItem('localUser');
        localStorage.removeItem('localPassword');
    }
}

// 監聽輸入變更
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', saveSettings);
});

// 頁面載入時載入設定
document.addEventListener('DOMContentLoaded', loadSavedSettings);
function startBackup() {
    // 清空輸出區域
    document.getElementById("output").innerHTML = "";
    document.getElementById("progressBar").style.width = "0%";

    // 獲取表單數據
    const dbName = document.getElementById("dbName").value;
    const remoteUser = document.getElementById("remoteUser").value;
    const remotePassword =
        document.getElementById("remotePassword").value;
    const remoteHost = document.getElementById("remoteHost").value;
    const localUser = document.getElementById("localUser").value;
    const localPassword =
        document.getElementById("localPassword").value;
    const recreateDb = document.getElementById("recreateDb").checked
        ? "y"
        : "n";
    const keepBackup = document.getElementById("keepBackup").checked
        ? "y"
        : "n";

    // 驗證輸入
    if (
        !dbName ||
        !remoteUser ||
        !remotePassword ||
        !remoteHost ||
        !localUser ||
        !localPassword
    ) {
        appendOutput("請填寫所有必要的資訊");
        return;
    }

    // 準備配置文件內容
    const localConfig = `[client]\nuser='${localUser}'\npassword='${localPassword}'\nhost=127.0.0.1\n`;
    const remoteConfig = `[client]\nuser='${remoteUser}'\npassword='${remotePassword}'\nhost=${remoteHost}\n`;

    console.log(keepBackup);

    // 發送備份請求
    ipcRenderer.send("start-backup", {
        dbName,
        localConfig,
        remoteConfig,
        recreateDb,
        keepBackup,
    });

    document.getElementById("progressBar").style.width = "10%";
}

// 監聽備份進度
ipcRenderer.on("backup-progress", (event, { message }) => {
    appendOutput(message);
    incrementProgress();
});

// 監聽錯誤訊息
ipcRenderer.on("backup-error", (event, { error }) => {
    appendOutput(`錯誤: ${error}`);
    document.getElementById("progressBar").style.backgroundColor =
        "#e74c3c";
});

// 監聽備份完成事件
ipcRenderer.on("backup-complete", (event, { success, canDownload }) => {
    if (success) {
        appendOutput("備份完成！");
        document.getElementById("progressBar").style.width = "100%";

        if(canDownload){
            const downloadBtn = document.createElement("button");
            downloadBtn.id = "downloadBtn";
            downloadBtn.textContent = "下載SQL備份"
            const output = document.getElementById("output");
            output.appendChild(downloadBtn);
    
            downloadBtn.addEventListener('click', function() {
                ipcRenderer.send('get-backup-path');
            });
        }
    } else {
        appendOutput("備份失敗！");
        document.getElementById(
            "progressBar"
        ).style.backgroundColor = "#e74c3c";
        document.getElementById("downloadBackup").disabled = true;
    }
});

ipcRenderer.on('backup-path', (event, { filePath }) => {
    const link = document.createElement('a');
    link.href = `file://${filePath}`;
    link.download = 'sql-backup.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function appendOutput(message) {
    const output = document.getElementById("output");
    output.innerHTML += message + "<br>";
    output.scrollTop = output.scrollHeight;
}

function incrementProgress() {
    const progressBar = document.getElementById("progressBar");
    const currentWidth = parseInt(progressBar.style.width) || 0;
    if (currentWidth < 90) {
        progressBar.style.width = currentWidth + 10 + "%";
    }
}