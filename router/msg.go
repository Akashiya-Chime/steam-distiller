package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ResponseData struct {
	Token AccessToken `json:"access_token"`
	Msg   string      `json:"msg"`
}

type GetUserRes struct {
	Msg      string `json:"msg"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

type Response struct {
	Code ReturnCode `json:"code"`
	Data any        `json:"data"`
}

func SendJsonMsg(c *gin.Context, code ReturnCode, msg string) {
	c.JSON(http.StatusOK, Response{
		Code: code,
		Data: ResponseData{
			Msg: msg,
		},
	})
}
