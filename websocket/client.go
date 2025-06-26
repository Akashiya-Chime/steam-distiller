package websocket

import (
	log "steam-distiller/logger"
	"sync"

	"github.com/gorilla/websocket"
)

type GameType int

const (
	L4D2 GameType = iota + 1
	Baro
)

type Client struct {
	Conn *websocket.Conn
	Game GameType
}

type BroadcastType struct {
	Msg  []byte
	Game GameType
}

type Manager struct {
	clients    map[*Client]bool
	broadcast  chan BroadcastType
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func (m *Manager) run() {
	for {
		select {
		case client := <-m.register:
			m.mu.Lock()
			m.clients[client] = true
			m.mu.Unlock()
			log.L.Infof("Game total: %v client registered.", len(m.clients))

		case client := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				client.Conn.Close()
			}
			m.mu.Unlock()
			log.L.Infof("Game total: %v client registered.", len(m.clients))

		case bc := <-m.broadcast:
			m.mu.RLock()
			var toUnregister []*Client
			for client := range m.clients {
				if bc.Game != client.Game {
					continue
				}
				if err := client.Conn.WriteMessage(websocket.TextMessage, bc.Msg); err != nil {
					log.L.Warnf("Write error, %v.", err)
					toUnregister = append(toUnregister, client)
				}
			}
			m.mu.RUnlock()

			// 集中处理去注册，避免死锁
			if len(toUnregister) > 0 {
				log.L.Infof("to Unregister num: %v.", len(toUnregister))
				go func() {
					for _, client := range toUnregister {
						m.unregister <- client
					}
				}()
			}
		}
	}
}

var manager = Manager{
	clients:    make(map[*Client]bool),
	broadcast:  make(chan BroadcastType),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func StartManager() {
	go manager.run()
}

func RegisterClient(conn *websocket.Conn, game GameType) *Client {
	client := &Client{Conn: conn, Game: game}
	manager.register <- client
	return client
}

func UnregisterClient(client *Client) {
	manager.unregister <- client
}

func Broadcast(bc BroadcastType) {
	manager.broadcast <- bc
}
