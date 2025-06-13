package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func apiRoutePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}
