package router

import (
	"net/http"
	"steam-distiller/controllers"
	log "steam-distiller/logger"
	ws "steam-distiller/websocket"
	"sync"

	"github.com/gin-gonic/gin"
)

var once sync.Once
var l4d2 controllers.GameContoller

func l4d2StartGame(c *gin.Context) {
	if l4d2.IsRunning() {
		SendJsonMsg(c, CODE_GAME_IS_RUNNING, "游戏正在运行")
		c.Abort()
		return
	}
	l4d2.StartGame()
	SendJsonMsg(c, CODE_OK, "启动游戏服务器成功")
}

func l4d2StopGame(c *gin.Context) {
	if !l4d2.IsRunning() {
		SendJsonMsg(c, CODE_GAME_IS_RUNNING, "游戏未在运行")
		c.Abort()
		return
	}
	l4d2.StopGame()
	SendJsonMsg(c, CODE_OK, "停止游戏服务器成功")
}

func onceInit() {
	once.Do(func() {
		// 初始化后会持续广播日志
		l4d2.Init(ws.L4D2, "/home/lighthouse/l4d2-server/run.sh", "quit")
	})
}

func l4d2LogHandler(c *gin.Context) {
	conn, err := ws.WsUpgrader(c)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
	}
	client := ws.RegisterClient(conn, ws.L4D2)

	conn.SetCloseHandler(func(code int, text string) error {
		log.L.Infof("Connection closed: %d %s\n", code, text)
		ws.UnregisterClient(client)
		return nil
	})
	defer l4d2.Close()

	onceInit()
}

type ServerStatus string

const (
	StatusRunning  ServerStatus = "running"
	StatusClosed   ServerStatus = "closed"
	StatusAbnormal ServerStatus = "abnormal"
)

type GetStatusRes struct {
	Msg    string       `json:"msg"`
	Status ServerStatus `json:"status"`
}

func l4d2Status(c *gin.Context) {
	if l4d2.IsRunning() {
		c.JSON(http.StatusOK, Response{
			Code: CODE_OK,
			Data: GetStatusRes{
				Msg:    "游戏服务器已启动",
				Status: StatusRunning,
			},
		})
		return
	}
	c.JSON(http.StatusOK, Response{
		Code: CODE_OK,
		Data: GetStatusRes{
			Msg:    "游戏服务器已关闭",
			Status: StatusClosed,
		},
	})
}
