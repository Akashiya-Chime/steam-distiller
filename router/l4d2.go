package router

import (
	"errors"
	"net/http"
	"path/filepath"
	"steam-distiller/config"
	"steam-distiller/controllers"
	"steam-distiller/def"
	"steam-distiller/env"
	log "steam-distiller/logger"
	ws "steam-distiller/websocket"
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
		// 初始化后会持续广播日o
		path := filepath.Join(env.GetL4D2Env().Path, "run.sh")
		onceErr = l4d2.Init(def.L4D2, path, "quit")
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
		log.L.Infof("Connection closed: %d %s\n", code, text)
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
	path := filepath.Join(env.GetL4D2Env().Path, "/left4dead2/cfg/", "server.cfg")
	l4d2Config := config.NewConfig[config.L4D2Config](path, def.L4D2)

	if err := l4d2Config.ReadConfigFile(); err != nil {
		log.L.Warnf("Read l4d2 config file failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "获取L4D2游戏配置失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "ok", l4d2Config.GameConfig)
}
