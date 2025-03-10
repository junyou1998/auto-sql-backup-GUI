#!/bin/bash

# 設定遠端名稱與備份sql檔名
source db-name-config.sh
BACKUP_FILE="sql-backup.sql"

# 從環境變數讀取設定，如果沒有設定則使用預設值
RECREATE_DB=${RECREATE_DB:-"n"}
KEEP_BACKUP=${KEEP_BACKUP:-"y"}

# 步驟 1: 備份遠端資料庫
echo "Step 1. 開始備份【遠端】資料庫..."
mysqldump --defaults-extra-file=.remote.cnf --no-set-names --no-tablespaces --single-transaction "$DB_NAME" > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "遠端資料庫備份成功!"
else
    echo "遠端資料庫備份失敗!"
    exit 1
fi

# 步驟 2: 檢查本機資料庫是否存在
echo "Step 2. 檢查【本機】資料庫是否存在..."
DB_EXISTS=$(mysql --defaults-extra-file=.local.cnf -e "SHOW DATABASES LIKE '$DB_NAME';" | grep "$DB_NAME" > /dev/null; echo $?)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "資料庫 '$DB_NAME' 已存在。"
    if [ "$RECREATE_DB" = "y" ]; then
        echo "根據設定，將刪除並重新創建資料庫..."
        mysql --defaults-extra-file=.local.cnf -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"
        if [ $? -eq 0 ]; then
            echo "資料庫 '$DB_NAME' 已成功重新創建!"
        else
            echo "重新創建資料庫失敗!"
            exit 1
        fi
    else
        echo "根據設定，將保留現有資料庫結構，僅更新資料內容。"
    fi
else
    echo "資料庫 '$DB_NAME' 不存在，將直接創建新資料庫..."
    mysql --defaults-extra-file=.local.cnf -e "CREATE DATABASE $DB_NAME;"
    if [ $? -eq 0 ]; then
        echo "資料庫 '$DB_NAME' 已成功創建!"
    else
        echo "創建資料庫失敗!"
        exit 1
    fi
fi

# 步驟 3: 將備份資料庫導入到本機資料庫
echo "Step 3. 將備份資料庫導入【本機】資料庫..."
mysql --defaults-extra-file=.local.cnf "$DB_NAME" < "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "資料庫導入成功!"
else
    echo "資料庫導入失敗!"
    exit 1
fi

# 完成
echo "操作完成，資料庫已同步!"

# 步驟 4: 根據設定決定是否保留備份檔案
if [ "$KEEP_BACKUP" = "n" ]; then
    echo "Step 4. 根據設定，將刪除備份檔案..."
    rm -f "$BACKUP_FILE"
    if [ $? -eq 0 ]; then
        echo "已成功刪除備份檔案!"
    else
        echo "刪除備份檔案失敗!"
        exit 1
    fi
else
    echo "Step 4. 根據設定，將保留備份檔案。"
fi
