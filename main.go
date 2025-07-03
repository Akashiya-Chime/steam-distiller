package main

import (
	"steam-distiller/env"
	"steam-distiller/invcode"
	"steam-distiller/logger"
	"steam-distiller/router"
	"steam-distiller/sql"
	"steam-distiller/websocket"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	logger.Init("MAIN")
}

func main() {
	env.InitEnv()
	engine := gin.Default()
	sql.Connect()
	defer sql.Close()
	websocket.StartManager()
	// 邀请码有效期10分钟
	invcode.InitInvCodeManager(10 * time.Minute)

	router.RouteRigister(engine)
	engine.Run(env.GetServerConfig().Port)
}
