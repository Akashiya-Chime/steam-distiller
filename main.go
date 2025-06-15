package main

import (
	"steam-distiller/router"
	"steam-distiller/sql"

	"github.com/gin-gonic/gin"
)

func main() {
	engine := gin.Default()
	sql.Connect()
	defer sql.Close()

	router.RouteRigister(engine)
	engine.Run(":8088")
}
