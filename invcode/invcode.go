package invcode

import (
	"crypto/rand"
	"encoding/base64"
	log "steam-distiller/logger"
	"sync"
	"time"
)

type InvCode struct {
	Code      string
	ExpiresAt time.Time
}

type InvCodeManager struct {
	mu       sync.RWMutex
	codes    map[string]InvCode
	validity time.Duration
}

var M InvCodeManager

func InitInvCodeManager(validity time.Duration) {
	M = InvCodeManager{
		codes:    make(map[string]InvCode),
		validity: validity,
	}

	go M.cleanupRoutine()
}

func (m *InvCodeManager) Generate() InvCode {
	m.mu.RLock()
	defer m.mu.RUnlock()

	code := generateRandomCode(8)
	expiresAt := time.Now().Add(m.validity)

	invCode := InvCode{
		Code:      code,
		ExpiresAt: expiresAt,
	}

	m.codes[code] = invCode
	return invCode
}

func (m *InvCodeManager) IsValid(code string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	invCode, exists := m.codes[code]
	if !exists {
		return false
	}

	if time.Now().After(invCode.ExpiresAt) {
		go func() {
			m.mu.Lock()
			delete(m.codes, code)
			m.mu.Unlock()
		}()
		return false
	}

	return true
}

func (m *InvCodeManager) cleanupExpiredCodes() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for code, invCode := range m.codes {
		if now.After(invCode.ExpiresAt) {
			delete(m.codes, code)
		}
	}
}

func (m *InvCodeManager) cleanupRoutine() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		m.cleanupExpiredCodes()
	}
}

func generateRandomCode(length int) string {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		log.L.Warnln("Generate random invitation code failed.")
		return ""
	}
	return base64.URLEncoding.EncodeToString(b)[:length]
}
