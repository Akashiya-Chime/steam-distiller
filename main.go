package main

import (
	"steam-distiller/env"
	"steam-distiller/logger"
	"steam-distiller/router"
	"steam-distiller/sql"

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

	router.RouteRigister(engine)
	engine.Run(env.GetServerConfig().Port)
}
