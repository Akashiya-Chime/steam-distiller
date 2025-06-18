package websocket

import (
	"net/http"
	"os/exec"
	log "steam-distiller/logger"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// 跨域问题，开发阶段允许所有来源
		return true
		// 通过配置文件配置服务器IP用于校验
		// return r.Header.Get("Origin") == "http://{IP}"
	},
}

func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}
	defer conn.Close()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			log.L.Warnf("Failed to read from websocket: %v", err)
			break
		}
		log.L.Infof("WS: Read from ws: %v\n", string(data))

		res := strings.Fields(string(data))

		cmd := exec.Command(res[0], res[1:]...)
		output, err := cmd.Output()
		if err != nil {
			log.Warnf("command start error: %v\n", err)
			output = []byte(err.Error())
		}

		if err := conn.WriteMessage(websocket.TextMessage, output); err != nil {
			log.Warnf("Failed to write to websocket: %v", err)
			break
		}
	}
}
