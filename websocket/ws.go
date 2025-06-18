package websocket

import (
	"bufio"
	"fmt"
	"net/http"
	"os/exec"
	"steam-distiller/env"
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
		// return true
		// 通过配置文件配置服务器IP用于校验
		origin := fmt.Sprintf("http://%s%s", env.GetServerConfig().Host, env.GetServerConfig().Port)
		return r.Header.Get("Origin") == origin
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
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			log.L.Fatal(err)
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			log.L.Fatal(err)
		}

		// 启动命令
		if err := cmd.Start(); err != nil {
			log.L.Infoln(err)
		}

		// 实时读取标准输出
		go func() {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				if err := conn.WriteMessage(websocket.TextMessage, scanner.Bytes()); err != nil {
					log.L.Warnf("Failed to write to websocket: %v", err)
					break
				}
			}
		}()

		go func() {
			scanner := bufio.NewScanner(stderr)
			for scanner.Scan() {
				if err := conn.WriteMessage(websocket.TextMessage, scanner.Bytes()); err != nil {
					log.L.Warnf("Failed to write to websocket: %v", err)
					break
				}
			}
		}()
	}
}
