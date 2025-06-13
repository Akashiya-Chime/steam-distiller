package router

import (
	"net/http"
	"steam-distiller/middleware/jwt"

	"github.com/gin-gonic/gin"
)

type RouteItem struct {
	Method  string
	Path    string
	Handler gin.HandlerFunc
}

var routes = []RouteItem{
	{http.MethodGet, "/", userHomePage},
	{http.MethodGet, "/ping", userRoutePing},
	{http.MethodGet, "/register", userRegister},
	// user
	{http.MethodPost, "/user/login", userLogin},
}

var apiv1Route = []RouteItem{
	{http.MethodGet, "/ping", apiRoutePing},
}

func RouteRigister(g *gin.Engine) {
	g.LoadHTMLGlob("web/*.html")
	g.Static("/static", "web/static")
	apiv1 := g.Group("/api/v1")
	apiv1.Use(jwt.JwtAuthor())

	for _, route := range routes {
		g.Handle(route.Method, route.Path, route.Handler)
	}

	for _, route := range apiv1Route {
		apiv1.Handle(route.Method, route.Path, route.Handler)
	}
}
