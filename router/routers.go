package router

import (
	"net/http"
	log "steam-distiller/logger"
	"steam-distiller/middleware/jwt"

	"github.com/gin-gonic/gin"
)

type RouteItem struct {
	Method  string
	Path    string
	Handler gin.HandlerFunc
}

var routes = []RouteItem{
	{http.MethodGet, "/", userIndexPage},
	{http.MethodGet, "/ping", userRoutePing},
	{http.MethodGet, "/register", userRegisterPage},
	// user
	{http.MethodPost, "/user/login", userLogin},
	{http.MethodPost, "/user/register", userRegister},
}

var authRoutes = []RouteItem{
	{http.MethodGet, "/home", userHomePage},
	{http.MethodGet, "/steamCMD", userSteamCMDPage},
	{http.MethodGet, "/left4dead2", userL4D2Page},
	{http.MethodGet, "/barotrauma", userBaroPage},
	{http.MethodGet, "/about", userAboutPage},
	{http.MethodGet, "/admin", userAdminPage},
}

var apiv1Route = []RouteItem{
	{http.MethodGet, "/ping", apiRoutePing},
	{http.MethodGet, "/users", userGetInfo},
	{http.MethodGet, "/l4d2/start", l4d2StartGame},
	{http.MethodGet, "/l4d2/stop", l4d2StopGame},
	{http.MethodGet, "/l4d2/log", l4d2LogHandler},
	{http.MethodGet, "/l4d2/status", l4d2Status},
}

func RouteRigister(g *gin.Engine) {
	g.LoadHTMLGlob("web/*.html")
	g.Static("/static", "web/static")
	auth := g.Group("/")
	auth.Use(jwt.JwtAuthor())
	apiv1 := g.Group("/api/v1")
	apiv1.Use(jwt.JwtAuthor())

	for _, route := range routes {
		g.Handle(route.Method, route.Path, route.Handler)
	}

	for _, route := range authRoutes {
		auth.Handle(route.Method, route.Path, route.Handler)
	}

	for _, route := range apiv1Route {
		apiv1.Handle(route.Method, route.Path, route.Handler)
	}

	log.L.Infoln("Register routes successfully.")
}
