# 使用說明

## 安裝 mysql-client
由於需要使用到 mysqldump 指令，所以需要安裝 mysql-client

```bash
brew install mysql-client  # 安裝 mysql-client
```
安裝完後，請將 mysql-client 的 bin 目錄加入到 PATH 環境變數中，例如：

```bash
echo 'export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc 
```