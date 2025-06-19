package websocket

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"steam-distiller/env"
	log "steam-distiller/logger"
	"strings"

	"github.com/creack/pty"
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

	startServer := exec.Command("bash")
	startCmd := "/home/lighthouse/l4d2-server/run.sh\n"
	stopCmd := "quit\n"
	var ptmx *os.File

	ptmx, err = pty.Start(startServer)
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
	defer func() { _ = ptmx.Close() }()

	// 实时读取标准输出
	go func() {
		scanner := bufio.NewScanner(ptmx)
		for scanner.Scan() {
			if err := conn.WriteMessage(websocket.TextMessage, scanner.Bytes()); err != nil {
				log.L.Warnf("Failed to write to websocket: %v", err)
				break
			}
		}
	}()

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			log.L.Warnf("Failed to read from websocket: %v", err)
			break
		}
		log.L.Infof("WS: Read from ws: %v\n", string(data))

		cmdStr := strings.Split(string(data), " ")

		if cmdStr[0] == "run" {
			if len(cmdStr) > 1 {
				// 注意避免命令注入攻击
				log.L.Infof("cmdStr1: %v\n", cmdStr[1])
				startCmd = fmt.Sprintf("/home/lighthouse/l4d2-server/run.sh %s\n", cmdStr[1])
			}
			_, err = ptmx.Write([]byte(startCmd))
			if err != nil {
				log.L.Warnf("Ptmx error, %v.\n", err)
			}
		}

		if cmdStr[0] == "stop" {
			_, err = ptmx.Write([]byte(stopCmd))
			if err != nil {
				log.L.Warnf("Ptmx error, %v.\n", err)
			}
		}
	}
}
