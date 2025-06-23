package router

import (
	"net/http"
	"steam-distiller/controllers"
	ws "steam-distiller/websocket"

	"github.com/gin-gonic/gin"
)

var l4d2 controllers.L4D2Contoller

func l4d2StartGame(c *gin.Context) {
	if l4d2.IsRunning() {
		// 反消息
		return
	}
	l4d2.Init()
	l4d2.StartGame()
}

func l4d2LogHandler(c *gin.Context) {
	conn, err := ws.WsUpgrader(c)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
	}
	client := ws.RegisterClient(conn, ws.L4D2)

	go func() {
		defer func() {
			ws.UnregisterClient(client)
			conn.Close()
		}()

		for {
			logs := <-l4d2.Logs
			broadcast := ws.BroadcastType{
				Msg:  logs,
				Game: ws.L4D2,
			}
			ws.Broadcast(broadcast)
		}
	}()
}
