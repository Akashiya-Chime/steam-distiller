# 需求设计

Steam Distiller（distiller `/dɪ'stɪlə/` 是蒸馏器的意思）

## 需求描述

 提供一个应用（Web App），用户通过在服务器上部署该应用，来实现在Web端启停、配置Steam游戏服务器。

### 用户场景

- 注册和登录：应用部署时通过配置管理员来对用户注册进行认证，管理员确认通过后用户可通过Web界面进行登录
- [SteamCMD](https://developer.valvesoftware.com/wiki/Zh/SteamCMD)：用户可以通过Web界面登录、运行SteamCMD，并能够在Web界面终端与SteamCMD交互
- 游戏服务器管理：用户可以通过Web界面对指定Steam游戏一键开服，并且可以通过Web界面配置游戏服务器参数、查看游戏服务器日志、上传游戏Mod

### 前端

提供用户友好的可交互式界面，具体细节 <font color=red>TODO</font>

### 后端

- 提供API与SteamCMD进行交互
- 提供API管理用户
- 提供API配置管理游戏服务器

### 构建和部署

使用容器提供构建及部署功能

### 依赖

服务器端口：

## UI设计

见：[steam-distiller UI](https://pixso.cn/app/editor/lW-I_zBgkqhh2xC8AgBmQQ?showQuickFrame=true&icon_type=1&page-id=0%3A1)

## 技术选型

- 前端提供的终端界面可以尝试 [Xterm.js](https://xtermjs.org/docs/)
- 后端使用Golang的 [Gin](https://gin-gonic.com/zh-cn/docs/) 框架提供API
- 后端使用WebSocket技术与前端建立可交互式终端
- 容器技术使用docker

