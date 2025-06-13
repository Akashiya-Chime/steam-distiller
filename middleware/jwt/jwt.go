package jwt

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const SECRET_KEY string = "neko.studio"
const MAX_TOKEN_LIVE uint = 6 // token过期时间6小时

func JwtGenToken(key string) (string, error) {
	secretKey := []byte(SECRET_KEY)
	claims := jwt.RegisteredClaims{
		Subject:   key,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(MAX_TOKEN_LIVE) * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(secretKey)
}

func JwtAuthor() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := c.GetHeader("Cookie")
		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "未提供认证token",
			})
			c.Abort()
			return
		}

		var claims jwt.RegisteredClaims
		_, err := jwt.ParseWithClaims(tokenStr, &claims,
			func(t *jwt.Token) (any, error) {
				return []byte(SECRET_KEY), nil
			})
		if err != nil {
			fmt.Println("无效token错误:", err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "无效token",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
