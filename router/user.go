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
	CODE_INV_CODE_INVALID
	CODE_USER_INFO_INVALID
	CODE_USER_ALREADY_EXIST
)

type User struct {
	Name     string `json:"username"`
	Password string `json:"password"`
	InvCode  string `json:"invitation_code"`
}

type AccessToken = string

func userRoutePing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "pong",
	})
}

func userIndexPage(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{})
}

func userRegisterPage(c *gin.Context) {
	c.HTML(http.StatusOK, "register.html", gin.H{})
}

func userHomePage(c *gin.Context) {
	c.HTML(http.StatusOK, "home.html", gin.H{})
}

func userTransDB(data User, isAdmin bool) sql.User {
	return sql.User{
		Username: data.Name,
		Password: data.Password,
		IsAdmin:  isAdmin,
	}
}

func isUserOk(user User) bool {
	// 先查询用户是否存在，避免上报error
	if !sql.IsUserExists(user.Name) {
		fmt.Println("User not exist.")
		return false
	}

	dbUser, err := sql.GetUser(userTransDB(user, false))
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
		SendJsonMsg(c, CODE_INNER_ERROR, "系统内部错误")
		c.Abort()
		return
	}

	if !isUserOk(user) {
		SendJsonMsg(c, CODE_LOGIN_FAILED, "登陆失败，请检查用户名及密码是否正确")
		c.Abort()
		return
	}

	token, err := jwt.JwtGenToken(user.Name)
	if err != nil {
		// TODO: 日志系统
		fmt.Println("Generate token failed:", err)
		SendJsonMsg(c, CODE_GEN_TOKEN_FAILED, "系统内部错误")
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

func IsInvCodeValid(code string) bool {
	// 验证码系统待实现
	// 管理员这边点一下生成一个邀请码，然后可以使用多次，邀请码过了有效期就不能使用
	if code == "" {
		return false
	}
	return true
}

func IsUserInfoValid(user User) bool {
	if user.Name == "" || user.Password == "" {
		return false
	}

	return true
}

func userRegister(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		fmt.Println("Serialize user info failed:", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "系统内部错误")
		c.Abort()
		return
	}

	// 先校验验证码
	if !IsInvCodeValid(user.InvCode) {
		SendJsonMsg(c, CODE_INV_CODE_INVALID, "无效验证码")
		c.Abort()
		return
	}

	if !IsUserInfoValid(user) {
		SendJsonMsg(c, CODE_USER_INFO_INVALID, "用户名或密码有误")
		c.Abort()
		return
	}

	err := sql.CreateUser(userTransDB(user, false))
	if err != sql.DB_OK {
		if err == sql.DB_DATA_ALREADY_EXIST {
			SendJsonMsg(c, CODE_USER_ALREADY_EXIST, "用户已存在")
		} else {
			SendJsonMsg(c, CODE_INNER_ERROR, "内部错误")
		}
		c.Abort()
		return
	}

	c.JSON(http.StatusOK, Response{
		Code: CODE_OK,
		Data: ResponseData{
			Msg: "注册成功",
		},
	})
}
