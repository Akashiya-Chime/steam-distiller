package jwt

import (
	"net/http"
	"steam-distiller/env"
	log "steam-distiller/logger"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const MAX_TOKEN_LIVE uint = 6 // token过期时间6小时

func JwtGenToken(key string) (string, int64, error) {
	secretKey := []byte(env.GetServerConfig().SecretKey)
	expiredAt := jwt.NewNumericDate(time.Now().Add(time.Duration(MAX_TOKEN_LIVE) * time.Hour))
	issuedAt := jwt.NewNumericDate(time.Now())

	claims := jwt.RegisteredClaims{
		Subject:   key,
		ExpiresAt: expiredAt,
		IssuedAt:  issuedAt,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		return "", 0, err
	}

	return signedToken, expiredAt.Unix(), nil
}

func JwtAuthor() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, err := c.Cookie("access_token")
		if err != nil || tokenStr == "" {
			if err == http.ErrNoCookie {
				log.L.Warnln("No access token in cookie.")
			} else {
				log.L.Warnln("Get cookie failed.")
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未提供认证token",
			})
			c.Abort()
			return
		}

		var claims jwt.RegisteredClaims
		_, err = jwt.ParseWithClaims(tokenStr, &claims,
			func(t *jwt.Token) (any, error) {
				return []byte(env.GetServerConfig().SecretKey), nil
			})
		if err != nil {
			log.L.Warnf("Invalid token, %v.", err)
			// 当token无效时，重定向回登陆页面
			c.Redirect(http.StatusFound, "/")
			c.Abort()
			return
		}
		c.Next()
	}
}
