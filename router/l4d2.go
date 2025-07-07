package router

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"steam-distiller/config"
	"steam-distiller/controllers"
	"steam-distiller/def"
	"steam-distiller/env"
	log "steam-distiller/logger"
	"steam-distiller/mod"
	ws "steam-distiller/websocket"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

var once sync.Once
var l4d2 controllers.GameContoller

func l4d2StartGame(c *gin.Context) {
	if err := l4d2.StartGame(); err != nil {
		if errors.Is(err, controllers.ErrIsRunning) {
			SendJsonMsg(c, CODE_GAME_IS_RUNNING, "游戏服务器正在运行", nil)
		} else {
			SendJsonMsg(c, CODE_INNER_ERROR, "启动游戏服务器失败，内部错误", nil)
		}
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "启动游戏服务器成功", nil)
}

func l4d2StopGame(c *gin.Context) {
	if err := l4d2.StopGame(); err != nil {
		if errors.Is(err, controllers.ErrIsNotRunning) {
			SendJsonMsg(c, CODE_GAME_IS_RUNNING, "游戏服务器未在运行", nil)
		} else {
			SendJsonMsg(c, CODE_INNER_ERROR, "停止游戏服务器失败，内部错误", nil)
		}
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "停止游戏服务器成功", nil)
}

var onceErr error

func onceInit() error {
	once.Do(func() {
		// 初始化后会持续广播日志
		path := filepath.Join(env.L4D2Path, "run_server.sh")
		startCmd := path + " " + env.L4D2Path
		onceErr = l4d2.Init(def.L4D2, startCmd)
	})
	return onceErr
}

func l4d2LogHandler(c *gin.Context) {
	conn, err := ws.WsUpgrader(c)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
	}
	client := ws.RegisterClient(conn, def.L4D2)

	conn.SetCloseHandler(func(code int, text string) error {
		log.L.Infof("Connection closed: %d %s.", code, text)
		ws.UnregisterClient(client)
		return nil
	})
	defer l4d2.Close()

	if err := onceInit(); err != nil {
		conn.Close()
		c.Abort()
		return
	}
}

type ServerStatus string

const (
	StatusRunning  ServerStatus = "running"
	StatusClosed   ServerStatus = "closed"
	StatusAbnormal ServerStatus = "abnormal"
)

type GetStatusRes struct {
	Status ServerStatus `json:"status"`
}

func l4d2Status(c *gin.Context) {
	if l4d2.IsRunning() {
		SendJsonMsg(c, CODE_OK, "游戏服务器已启动", GetStatusRes{Status: StatusRunning})
		c.Abort()
		return
	}
	SendJsonMsg(c, CODE_OK, "游戏服务器已关闭", GetStatusRes{Status: StatusClosed})
}

func l4d2GetConfig(c *gin.Context) {
	path := filepath.Join(env.L4D2ConfigPath, "server.cfg")
	// 方便windows下调试，release版本需删除
	if runtime.GOOS == "windows" {
		path = "default_server.cfg"
	}
	l4d2Config := config.NewConfig[config.L4D2Config](path, def.L4D2)

	if err := l4d2Config.ReadConfigFile(); err != nil {
		log.L.Warnf("Read l4d2 config file failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "获取L4D2游戏配置失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "ok", l4d2Config.GameConfig)
}

func l4d2SetConfig(c *gin.Context) {
	path := filepath.Join(env.L4D2ConfigPath, "server.cfg")
	// 方便windows下调试，release版本需删除
	if runtime.GOOS == "windows" {
		path = "default_server.cfg"
	}
	l4d2Config := config.NewConfig[config.L4D2Config](path, def.L4D2)

	if err := c.ShouldBindJSON(&l4d2Config.GameConfig); err != nil {
		log.L.Warnf("Serialize l4d2 config failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "系统内部错误", nil)
		c.Abort()
		return
	}

	if err := l4d2Config.UpdateConfig(); err != nil {
		log.L.Warnf("Update l4d2 config file failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "更新L4D2游戏配置失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "ok", nil)
}

func l4d2UploadMod(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		SendJsonMsg(c, CODE_PARAM_ERROR, "文件获取失败", nil)
		c.Abort()
		return
	}

	tag := c.PostForm("tag")
	if tag == "" {
		SendJsonMsg(c, CODE_PARAM_ERROR, "缺少tag参数", nil)
		c.Abort()
		return
	}

	if strings.Contains(tag, "..") || strings.HasPrefix(tag, "/") {
		SendJsonMsg(c, CODE_INVALID_TAG, "无效tag", nil)
		c.Abort()
		return
	}

	user := c.PostForm("user")
	if tag == "" {
		SendJsonMsg(c, CODE_PARAM_ERROR, "缺少user参数", nil)
		c.Abort()
		return
	}

	path := filepath.Join(env.L4D2ModPath, file.Filename)
	if err := c.SaveUploadedFile(file, path); err != nil {
		SendJsonMsg(c, CODE_INNER_ERROR, "保存文件失败", nil)
		c.Abort()
		return
	}

	if err := mod.WriteMod(tag, file.Filename, user); err != nil {
		log.L.Warnf("Write mod failed, %v.", err)
		if errors.Is(err, mod.ErrDuplicateTagOrFile) {
			SendJsonMsg(c, CODE_DUPLICATE_TAG_OR_FILE, "tag或文件重复", nil)
		} else {
			SendJsonMsg(c, CODE_INNER_ERROR, "写入mod列表失败", nil)
		}
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "上传mod成功", nil)
}

func l4d2GetMods(c *gin.Context) {
	mods, err := mod.ReadMods()
	if err != nil {
		SendJsonMsg(c, CODE_INNER_ERROR, "读取mod列表失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "ok", mods)
}

func l4d2DeleteMod(c *gin.Context) {
	tag := c.Query("tag")
	if tag == "" {
		SendJsonMsg(c, CODE_PARAM_ERROR, "缺少tag参数", nil)
		c.Abort()
		return
	}

	if strings.Contains(tag, "..") || strings.HasPrefix(tag, "/") {
		SendJsonMsg(c, CODE_INVALID_TAG, "无效tag", nil)
		c.Abort()
		return
	}

	modInfo, err := mod.GetMod(tag)
	if err != nil {
		SendJsonMsg(c, CODE_INVALID_TAG, "无效tag", nil)
		c.Abort()
		return
	}

	path := filepath.Join(env.L4D2ConfigPath, modInfo.File)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		SendJsonMsg(c, CODE_INNER_ERROR, "文件未找到", nil)
		c.Abort()
		return
	}

	if err := os.Remove(path); err != nil {
		SendJsonMsg(c, CODE_INNER_ERROR, "文件删除失败", nil)
		c.Abort()
		return
	}

	if err := mod.DeleteMod(tag); err != nil {
		log.L.Warnf("Delete mod failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "删除mod失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "删除mod成功", nil)
}
