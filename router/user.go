package router

import (
	"fmt"
	"net/http"

	"steam-distiller/middleware/jwt"

	"github.com/gin-gonic/gin"
)

const (
	CODE_OK = iota
	CODE_ERROR
)

type User struct {
	Name     string `json:"name"`
	Password string `json:"password"`
}

type AccessToken = string

type ResponseData struct {
	Token AccessToken `json:"access_token"`
	Msg   string      `json:"msg"`
}

type Response struct {
	Code uint `json:"code"`
	Data any  `json:"data"`
}

func userHomePage(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{})
}

func userRoutePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func userRegister(c *gin.Context) {
	c.HTML(http.StatusOK, "register.html", gin.H{})
}

func userLogin(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code: CODE_ERROR,
			Data: ResponseData{},
		})
		return
	}

	token, err := jwt.JwtGenToken(user.Name)
	if err != nil {
		// TODO: 日志系统
		fmt.Println("生成token失败:", err)
		c.JSON(http.StatusBadRequest, Response{
			Code: CODE_ERROR,
			Data: ResponseData{},
		})
		c.Abort()
		return
	}

	// TODO: 存DB

	c.JSON(http.StatusOK, Response{
		Code: CODE_OK,
		Data: ResponseData{
			Token: token,
			Msg:   "登录成功",
		},
	})
}
