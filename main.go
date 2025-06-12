package main

import (
	"steam-distiller/router"

	"github.com/gin-gonic/gin"
)

func main() {
	engine := gin.Default()

	router.RouteRigister(engine)
	engine.Run(":8088")
}
