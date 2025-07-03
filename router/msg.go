package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code ReturnCode `json:"code"`
	Msg  string     `json:"msg"`
	Data any        `json:"data"`
}

func SendJsonMsg(c *gin.Context, code ReturnCode, msg string, data any) {
	c.JSON(http.StatusOK, Response{
		Code: code,
		Msg:  msg,
		Data: data,
	})
}
