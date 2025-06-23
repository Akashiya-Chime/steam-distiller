package websocket

import (
	"fmt"
	"net/http"
	"steam-distiller/env"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := fmt.Sprintf(
			"http://%s%s",
			env.GetServerConfig().Host,
			env.GetServerConfig().Port,
		)
		return r.Header.Get("Origin") == origin
	},
}

func WsUpgrader(c *gin.Context) (*websocket.Conn, error) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return nil, err
	}

	return conn, nil
}
