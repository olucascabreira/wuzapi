package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// GetConversationsHandler returns all conversations for the authenticated user
func (s *server) GetConversationsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		// Parse query parameters
		includeArchived := r.URL.Query().Get("include_archived") == "true"

		conversations, err := s.GetConversations(txtid, includeArchived)
		if err != nil {
			s.Respond(w, r, http.StatusInternalServerError, map[string]interface{}{
				"error":   true,
				"message": "Failed to get conversations: " + err.Error(),
			})
			return
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success":       true,
			"conversations": conversations,
			"count":         len(conversations),
		})
	}
}

// GetConversationHandler returns a single conversation details
func (s *server) GetConversationHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		vars := mux.Vars(r)
		chatJID := vars["jid"]
		if chatJID == "" {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "chat_jid is required",
			})
			return
		}

		conversation, err := s.GetConversation(txtid, chatJID)
		if err != nil {
			s.Respond(w, r, http.StatusNotFound, map[string]interface{}{
				"error":   true,
				"message": "Conversation not found",
			})
			return
		}

		// Get recent messages for the conversation
		limit := 50
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		offset := 0
		if o := r.URL.Query().Get("offset"); o != "" {
			if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
				offset = parsed
			}
		}

		messages, err := s.GetMessagesWithPagination(txtid, chatJID, limit, offset)
		if err != nil {
			messages = []HistoryMessage{}
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success":      true,
			"conversation": conversation,
			"messages":     messages,
		})
	}
}

// UpdateConversationHandler updates conversation settings (pin, mute, archive)
func (s *server) UpdateConversationHandler() http.HandlerFunc {
	type updateRequest struct {
		IsMuted    *bool `json:"is_muted"`
		IsArchived *bool `json:"is_archived"`
		IsPinned   *bool `json:"is_pinned"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		vars := mux.Vars(r)
		chatJID := vars["jid"]
		if chatJID == "" {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "chat_jid is required",
			})
			return
		}

		var req updateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "Invalid request body",
			})
			return
		}

		err := s.UpdateConversationSettings(txtid, chatJID, req.IsMuted, req.IsArchived, req.IsPinned)
		if err != nil {
			s.Respond(w, r, http.StatusInternalServerError, map[string]interface{}{
				"error":   true,
				"message": "Failed to update conversation: " + err.Error(),
			})
			return
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Conversation updated",
		})
	}
}

// ResetUnreadHandler resets the unread count for a conversation
func (s *server) ResetUnreadHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		vars := mux.Vars(r)
		chatJID := vars["jid"]
		if chatJID == "" {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "chat_jid is required",
			})
			return
		}

		err := s.ResetUnreadCount(txtid, chatJID)
		if err != nil {
			s.Respond(w, r, http.StatusInternalServerError, map[string]interface{}{
				"error":   true,
				"message": "Failed to reset unread count: " + err.Error(),
			})
			return
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "Unread count reset",
		})
	}
}

// SearchMessagesHandler searches messages by text content
func (s *server) SearchMessagesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		query := r.URL.Query().Get("q")
		if query == "" {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "Search query 'q' is required",
			})
			return
		}

		chatJID := r.URL.Query().Get("chat_jid") // optional filter by chat

		limit := 50
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
				limit = parsed
			}
		}

		messages, err := s.SearchMessages(txtid, query, chatJID, limit)
		if err != nil {
			s.Respond(w, r, http.StatusInternalServerError, map[string]interface{}{
				"error":   true,
				"message": "Failed to search messages: " + err.Error(),
			})
			return
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success":  true,
			"messages": messages,
			"count":    len(messages),
			"query":    query,
		})
	}
}

// GetMessageStatusHandler returns the delivery/read status of a message
func (s *server) GetMessageStatusHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		vars := mux.Vars(r)
		messageID := vars["msgid"]
		if messageID == "" {
			s.Respond(w, r, http.StatusBadRequest, map[string]interface{}{
				"error":   true,
				"message": "message_id is required",
			})
			return
		}

		statuses, err := s.GetMessageStatus(messageID, txtid)
		if err != nil {
			s.Respond(w, r, http.StatusInternalServerError, map[string]interface{}{
				"error":   true,
				"message": "Failed to get message status: " + err.Error(),
			})
			return
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success":    true,
			"message_id": messageID,
			"statuses":   statuses,
		})
	}
}

// PollResponse represents the response structure for polling
type PollResponse struct {
	Messages   []HistoryMessage        `json:"messages"`
	Typing     []TypingStatus          `json:"typing"`
	Presence   []PresenceStatus        `json:"presence"`
	Receipts   []MessageStatusUpdate   `json:"receipts"`
	Timestamp  int64                   `json:"timestamp"`
	HasMore    bool                    `json:"has_more"`
}

// TypingStatus represents typing indicator status
type TypingStatus struct {
	ChatJID   string `json:"chat_jid"`
	SenderJID string `json:"sender_jid"`
	IsTyping  bool   `json:"is_typing"`
	Media     string `json:"media,omitempty"` // "audio" for voice recording
	Timestamp int64  `json:"timestamp"`
}

// PresenceStatus represents online/offline status
type PresenceStatus struct {
	JID         string `json:"jid"`
	IsOnline    bool   `json:"is_online"`
	LastSeen    int64  `json:"last_seen,omitempty"`
	Timestamp   int64  `json:"timestamp"`
}

// MessageStatusUpdate represents a message status change
type MessageStatusUpdate struct {
	MessageID string `json:"message_id"`
	Status    string `json:"status"` // sent, delivered, read
	Timestamp int64  `json:"timestamp"`
}

// PollEventsHandler returns new events since last poll timestamp
func (s *server) PollEventsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txtid := r.Context().Value("userinfo").(Values).Get("Id")
		if txtid == "" {
			s.Respond(w, r, http.StatusUnauthorized, nil)
			return
		}

		// Parse since timestamp
		sinceStr := r.URL.Query().Get("since")
		var since time.Time
		if sinceStr != "" {
			if ts, err := strconv.ParseInt(sinceStr, 10, 64); err == nil {
				since = time.Unix(ts, 0)
			}
		}
		if since.IsZero() {
			// Default to last 5 minutes if no timestamp provided
			since = time.Now().Add(-5 * time.Minute)
		}

		// Parse limit
		limit := 100
		if l := r.URL.Query().Get("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 500 {
				limit = parsed
			}
		}

		// Optional: filter by specific chat
		chatJID := r.URL.Query().Get("chat_jid")

		// Get new messages
		var messages []HistoryMessage
		var err error

		if chatJID != "" {
			// Get messages for specific chat since timestamp
			messages, err = s.GetMessagesSinceForChat(txtid, chatJID, since, limit)
		} else {
			// Get all messages since timestamp
			messages, err = s.GetMessagesSince(txtid, since, limit)
		}

		if err != nil {
			messages = []HistoryMessage{}
		}

		// Get typing and presence status from cache
		typing := s.getTypingStatus(txtid)
		presence := s.getPresenceStatus(txtid)

		// Get receipt updates
		receipts := s.getReceiptUpdates(txtid, since)

		response := PollResponse{
			Messages:  messages,
			Typing:    typing,
			Presence:  presence,
			Receipts:  receipts,
			Timestamp: time.Now().Unix(),
			HasMore:   len(messages) >= limit,
		}

		s.Respond(w, r, http.StatusOK, map[string]interface{}{
			"success": true,
			"data":    response,
		})
	}
}

// GetMessagesSinceForChat retrieves messages for a specific chat since a given timestamp
func (s *server) GetMessagesSinceForChat(userID, chatJID string, since time.Time, limit int) ([]HistoryMessage, error) {
	query := `SELECT * FROM message_history
		WHERE user_id = $1 AND chat_jid = $2 AND timestamp > $3
		ORDER BY timestamp ASC LIMIT $4`
	if s.db.DriverName() == "sqlite" {
		query = `SELECT * FROM message_history
			WHERE user_id = ? AND chat_jid = ? AND timestamp > ?
			ORDER BY timestamp ASC LIMIT ?`
	}

	var messages []HistoryMessage
	err := s.db.Select(&messages, query, userID, chatJID, since, limit)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// getTypingStatus returns typing status from cache
func (s *server) getTypingStatus(userID string) []TypingStatus {
	return GetChatPanelCache().GetTyping(userID)
}

// getPresenceStatus returns presence status from cache
func (s *server) getPresenceStatus(userID string) []PresenceStatus {
	return GetChatPanelCache().GetPresence(userID)
}

// getReceiptUpdates returns receipt updates from cache since the given timestamp
func (s *server) getReceiptUpdates(userID string, since time.Time) []MessageStatusUpdate {
	return GetChatPanelCache().GetReceipts(userID, since)
}
