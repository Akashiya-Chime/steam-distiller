package router

import (
	"fmt"
	"net/http"

	"steam-distiller/middleware/jwt"
	"steam-distiller/sql"

	"github.com/gin-gonic/gin"
)

type ReturnCode uint

const (
	CODE_OK ReturnCode = iota
	CODE_ERROR
	CODE_INNER_ERROR
	CODE_GEN_TOKEN_FAILED
	CODE_LOGIN_FAILED
)

type User struct {
	Name     string `json:"username"`
	Password string `json:"password"`
}

type AccessToken = string

type ResponseData struct {
	Token AccessToken `json:"access_token"`
	Msg   string      `json:"msg"`
}

type Response struct {
	Code ReturnCode `json:"code"`
	Data any        `json:"data"`
}

func userRoutePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func userIndexPage(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{})
}

func userRegister(c *gin.Context) {
	c.HTML(http.StatusOK, "register.html", gin.H{})
}

func userHomePage(c *gin.Context) {
	c.HTML(http.StatusOK, "home.html", gin.H{})
}

func userTransDB(data User) sql.User {
	return sql.User{
		Username: data.Name,
		Password: data.Password,
	}
}

func isUserOk(user User) bool {
	// 先查询用户是否存在，避免上报error
	if !sql.IsUserExists(user.Name) {
		fmt.Println("User not exist.")
		return false
	}

	dbUser, err := sql.GetUser(userTransDB(user))
	if err != sql.DB_OK || dbUser.Password != user.Password {
		fmt.Println("Check user password failed.")
		return false
	}

	return true
}

func userLogin(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		fmt.Println("Serialize user info failed:", err)
		c.JSON(http.StatusOK, Response{
			Code: CODE_INNER_ERROR,
			Data: ResponseData{
				Msg: "系统内部错误",
			},
		})
		c.Abort()
		return
	}

	if !isUserOk(user) {
		c.JSON(http.StatusOK, Response{
			Code: CODE_LOGIN_FAILED,
			Data: ResponseData{
				Msg: "登陆失败，请检查用户名及密码是否正确",
			},
		})
		c.Abort()
		return
	}

	token, err := jwt.JwtGenToken(user.Name)
	if err != nil {
		// TODO: 日志系统
		fmt.Println("Generate token failed:", err)
		c.JSON(http.StatusOK, Response{
			Code: CODE_GEN_TOKEN_FAILED,
			Data: ResponseData{
				Msg: "系统内部错误",
			},
		})
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, Response{
		Code: CODE_OK,
		Data: ResponseData{
			Token: token,
			Msg:   "登录成功",
		},
	})
}
