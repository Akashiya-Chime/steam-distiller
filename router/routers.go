package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type RouteItem struct {
	Method      string
	Path        string
	Handler     gin.HandlerFunc
	Middlewares []gin.HandlerFunc
}

var routes = []RouteItem{
	{http.MethodGet, "/", userHomePage, nil},
	{http.MethodGet, "/ping", userRoutePing, nil},
	{http.MethodGet, "/register", userRegister, nil},
}

func RouteRigister(g *gin.Engine) {
	g.LoadHTMLGlob("web/*.html")
	g.Static("/static", "web/static")

	for _, route := range routes {
		handlers := append(route.Middlewares, route.Handler)
		g.Handle(route.Method, route.Path, handlers...)
	}
}
