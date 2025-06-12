package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func userHomePage(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{})
}

func userRoutePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}
