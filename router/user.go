package router

import (
	"net/http"
	"steam-distiller/invcode"
	log "steam-distiller/logger"

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
	CODE_USER_NOT_EXIST
	CODE_GAME_IS_RUNNING
	CODE_USER_NOT_ADMIN
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

func userSteamCMDPage(c *gin.Context) {
	c.HTML(http.StatusOK, "steamCMD.html", gin.H{})
}

func userL4D2Page(c *gin.Context) {
	c.HTML(http.StatusOK, "l4d2.html", gin.H{})
}

func userBaroPage(c *gin.Context) {
	c.HTML(http.StatusOK, "baro.html", gin.H{})
}

func userAboutPage(c *gin.Context) {
	c.HTML(http.StatusOK, "about.html", gin.H{})
}

func userAdminPage(c *gin.Context) {
	c.HTML(http.StatusOK, "admin.html", gin.H{})
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
		log.L.Infoln("User not exist.")
		return false
	}

	dbUser, err := sql.GetUser(userTransDB(user, false))
	if err != sql.DB_OK || dbUser.Password != user.Password {
		log.L.Infoln("Check user password failed.")
		return false
	}

	return true
}

type TokenRes struct {
	Token AccessToken `json:"access_token"`
}

func userLogin(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		log.L.Warnf("Serialize user info failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "系统内部错误", nil)
		c.Abort()
		return
	}

	if !isUserOk(user) {
		SendJsonMsg(c, CODE_LOGIN_FAILED, "登陆失败，请检查用户名及密码是否正确", nil)
		c.Abort()
		return
	}

	token, err := jwt.JwtGenToken(user.Name)
	if err != nil {
		log.L.Warnf("Generate token failed, %v.", err)
		SendJsonMsg(c, CODE_GEN_TOKEN_FAILED, "系统内部错误", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "登录成功", TokenRes{Token: token})
}

func IsInvCodeValid(code string) bool {
	return invcode.M.IsValid(code)
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
		log.L.Warnf("Serialize user info failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "系统内部错误", nil)
		c.Abort()
		return
	}

	// 先校验邀请码
	if !IsInvCodeValid(user.InvCode) {
		SendJsonMsg(c, CODE_INV_CODE_INVALID, "无效邀请码", nil)
		c.Abort()
		return
	}

	if !IsUserInfoValid(user) {
		SendJsonMsg(c, CODE_USER_INFO_INVALID, "用户名或密码有误", nil)
		c.Abort()
		return
	}

	err := sql.CreateUser(userTransDB(user, false))
	if err != sql.DB_OK {
		if err == sql.DB_DATA_ALREADY_EXIST {
			SendJsonMsg(c, CODE_USER_ALREADY_EXIST, "用户已存在", nil)
		} else {
			SendJsonMsg(c, CODE_INNER_ERROR, "内部错误", nil)
		}
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "注册成功", nil)
}

type GetUserRes struct {
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
}

func userGetInfo(c *gin.Context) {
	username := c.Query("username")
	if len(username) == 0 {
		SendJsonMsg(c, CODE_ERROR, "无用户名", nil)
		c.Abort()
		return
	}

	if !sql.IsUserExists(username) {
		SendJsonMsg(c, CODE_USER_NOT_EXIST, "用户不存在", nil)
		c.Abort()
		return
	}

	dbUser, err := sql.GetUser(sql.User{Username: username})
	if err != sql.DB_OK {
		log.L.Warnf("Get user info from db failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "查询用户失败", nil)
		c.Abort()
		return
	}

	SendJsonMsg(c, CODE_OK, "ok", GetUserRes{Username: username, IsAdmin: dbUser.IsAdmin})
}

type GetInvCodeRes struct {
	InvCode string `json:"invite_code"`
}

func userGetInvCode(c *gin.Context) {
	var user User
	c.ShouldBindJSON(&user)

	dbUser, err := sql.GetUser(sql.User{Username: user.Name})
	if err != sql.DB_OK {
		log.L.Warnf("Get user info from db failed, %v.", err)
		SendJsonMsg(c, CODE_INNER_ERROR, "查询用户失败", nil)
		c.Abort()
		return
	}

	if !dbUser.IsAdmin {
		SendJsonMsg(c, CODE_USER_NOT_ADMIN, "无获取邀请码权限", nil)
		c.Abort()
		return
	}

	code := invcode.M.Generate()
	SendJsonMsg(c, CODE_OK, "ok", GetInvCodeRes{InvCode: code.Code})
}
