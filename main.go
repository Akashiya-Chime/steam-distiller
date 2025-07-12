package main

import (
	"log"
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
	// 默认32MB，扩大为500MB
	engine.MaxMultipartMemory = 1024 * 1024 * 500
	sql.Connect()
	defer sql.Close()
	if res := sql.SetAdmin(); res != sql.DB_OK {
		log.Fatal("Set admin failed.")
	}
	websocket.StartManager()
	// 邀请码有效期10分钟
	invcode.InitInvCodeManager(10 * time.Minute)

	router.RouteRigister(engine)
	engine.Run(env.GetServerConfig().Port)
}
