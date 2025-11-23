package main

import (
	"sync"
	"time"
)

// ChatPanelCache manages typing and presence status for the chat panel
type ChatPanelCache struct {
	typing   map[string]map[string]*TypingEntry   // userID -> chatJID -> typing entry
	presence map[string]map[string]*PresenceEntry // userID -> jid -> presence entry
	receipts map[string][]MessageStatusUpdate     // userID -> receipt updates
	mu       sync.RWMutex
}

// TypingEntry represents a typing status entry with expiration
type TypingEntry struct {
	SenderJID string
	Media     string // "audio" for voice recording, empty for text
	Timestamp time.Time
	ExpiresAt time.Time
}

// PresenceEntry represents a presence status entry
type PresenceEntry struct {
	IsOnline  bool
	LastSeen  time.Time
	Timestamp time.Time
}

// Global chat panel cache instance
var chatPanelCache *ChatPanelCache
var chatPanelCacheOnce sync.Once

// GetChatPanelCache returns the singleton chat panel cache instance
func GetChatPanelCache() *ChatPanelCache {
	chatPanelCacheOnce.Do(func() {
		chatPanelCache = &ChatPanelCache{
			typing:   make(map[string]map[string]*TypingEntry),
			presence: make(map[string]map[string]*PresenceEntry),
			receipts: make(map[string][]MessageStatusUpdate),
		}
		// Start cleanup goroutine
		go chatPanelCache.cleanupLoop()
	})
	return chatPanelCache
}

// SetTyping sets the typing status for a chat
func (c *ChatPanelCache) SetTyping(userID, chatJID, senderJID, media string, isTyping bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.typing[userID] == nil {
		c.typing[userID] = make(map[string]*TypingEntry)
	}

	if isTyping {
		c.typing[userID][chatJID] = &TypingEntry{
			SenderJID: senderJID,
			Media:     media,
			Timestamp: time.Now(),
			ExpiresAt: time.Now().Add(10 * time.Second), // Typing expires after 10 seconds
		}
	} else {
		delete(c.typing[userID], chatJID)
	}
}

// GetTyping returns all active typing statuses for a user
func (c *ChatPanelCache) GetTyping(userID string) []TypingStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := []TypingStatus{}
	now := time.Now()

	if userTyping, ok := c.typing[userID]; ok {
		for chatJID, entry := range userTyping {
			if entry.ExpiresAt.After(now) {
				result = append(result, TypingStatus{
					ChatJID:   chatJID,
					SenderJID: entry.SenderJID,
					IsTyping:  true,
					Media:     entry.Media,
					Timestamp: entry.Timestamp.Unix(),
				})
			}
		}
	}

	return result
}

// SetPresence sets the presence status for a JID
func (c *ChatPanelCache) SetPresence(userID, jid string, isOnline bool, lastSeen time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.presence[userID] == nil {
		c.presence[userID] = make(map[string]*PresenceEntry)
	}

	c.presence[userID][jid] = &PresenceEntry{
		IsOnline:  isOnline,
		LastSeen:  lastSeen,
		Timestamp: time.Now(),
	}
}

// GetPresence returns all presence statuses for a user
func (c *ChatPanelCache) GetPresence(userID string) []PresenceStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := []PresenceStatus{}

	if userPresence, ok := c.presence[userID]; ok {
		for jid, entry := range userPresence {
			status := PresenceStatus{
				JID:       jid,
				IsOnline:  entry.IsOnline,
				Timestamp: entry.Timestamp.Unix(),
			}
			if !entry.LastSeen.IsZero() {
				status.LastSeen = entry.LastSeen.Unix()
			}
			result = append(result, status)
		}
	}

	return result
}

// GetPresenceForJID returns presence status for a specific JID
func (c *ChatPanelCache) GetPresenceForJID(userID, jid string) *PresenceStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if userPresence, ok := c.presence[userID]; ok {
		if entry, ok := userPresence[jid]; ok {
			status := &PresenceStatus{
				JID:       jid,
				IsOnline:  entry.IsOnline,
				Timestamp: entry.Timestamp.Unix(),
			}
			if !entry.LastSeen.IsZero() {
				status.LastSeen = entry.LastSeen.Unix()
			}
			return status
		}
	}

	return nil
}

// AddReceipt adds a message status update to the cache
func (c *ChatPanelCache) AddReceipt(userID string, update MessageStatusUpdate) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.receipts[userID] == nil {
		c.receipts[userID] = []MessageStatusUpdate{}
	}

	c.receipts[userID] = append(c.receipts[userID], update)

	// Keep only last 1000 receipts per user
	if len(c.receipts[userID]) > 1000 {
		c.receipts[userID] = c.receipts[userID][len(c.receipts[userID])-500:]
	}
}

// GetReceipts returns receipt updates since a given timestamp
func (c *ChatPanelCache) GetReceipts(userID string, since time.Time) []MessageStatusUpdate {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := []MessageStatusUpdate{}
	sinceUnix := since.Unix()

	if userReceipts, ok := c.receipts[userID]; ok {
		for _, receipt := range userReceipts {
			if receipt.Timestamp > sinceUnix {
				result = append(result, receipt)
			}
		}
	}

	return result
}

// ClearReceipts clears old receipt entries for a user
func (c *ChatPanelCache) ClearReceipts(userID string, before time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()

	beforeUnix := before.Unix()
	newReceipts := []MessageStatusUpdate{}

	if userReceipts, ok := c.receipts[userID]; ok {
		for _, receipt := range userReceipts {
			if receipt.Timestamp >= beforeUnix {
				newReceipts = append(newReceipts, receipt)
			}
		}
		c.receipts[userID] = newReceipts
	}
}

// cleanupLoop periodically cleans up expired entries
func (c *ChatPanelCache) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		c.cleanup()
	}
}

// cleanup removes expired typing entries and old receipts
func (c *ChatPanelCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()

	// Clean up expired typing entries
	for userID, userTyping := range c.typing {
		for chatJID, entry := range userTyping {
			if entry.ExpiresAt.Before(now) {
				delete(userTyping, chatJID)
			}
		}
		if len(userTyping) == 0 {
			delete(c.typing, userID)
		}
	}

	// Clean up old receipts (older than 1 hour)
	oneHourAgo := now.Add(-1 * time.Hour).Unix()
	for userID, userReceipts := range c.receipts {
		newReceipts := []MessageStatusUpdate{}
		for _, receipt := range userReceipts {
			if receipt.Timestamp >= oneHourAgo {
				newReceipts = append(newReceipts, receipt)
			}
		}
		if len(newReceipts) > 0 {
			c.receipts[userID] = newReceipts
		} else {
			delete(c.receipts, userID)
		}
	}
}

// ClearUserCache clears all cache entries for a user (e.g., on disconnect)
func (c *ChatPanelCache) ClearUserCache(userID string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.typing, userID)
	delete(c.presence, userID)
	delete(c.receipts, userID)
}
