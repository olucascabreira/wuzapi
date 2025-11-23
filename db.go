package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

type DatabaseConfig struct {
	Type     string
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	Path     string
	SSLMode  string
}

func InitializeDatabase(exPath string) (*sqlx.DB, error) {
	config := getDatabaseConfig(exPath)

	if config.Type == "postgres" {
		return initializePostgres(config)
	}
	return initializeSQLite(config)
}

func getDatabaseConfig(exPath string) DatabaseConfig {
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbSSL := os.Getenv("DB_SSLMODE")

	sslMode := dbSSL
	if dbSSL == "true" {
		sslMode = "require"
	} else if dbSSL == "false" || dbSSL == "" {
		sslMode = "disable"
	}

	if dbUser != "" && dbPassword != "" && dbName != "" && dbHost != "" && dbPort != "" {
		return DatabaseConfig{
			Type:     "postgres",
			Host:     dbHost,
			Port:     dbPort,
			User:     dbUser,
			Password: dbPassword,
			Name:     dbName,
			SSLMode:  sslMode,
		}
	}

	return DatabaseConfig{
		Type: "sqlite",
		Path: filepath.Join(exPath, "dbdata"),
	}
}

func initializePostgres(config DatabaseConfig) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"user=%s password=%s dbname=%s host=%s port=%s sslmode=%s",
		config.User, config.Password, config.Name, config.Host, config.Port, config.SSLMode,
	)

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres database: %w", err)
	}

	return db, nil
}

func initializeSQLite(config DatabaseConfig) (*sqlx.DB, error) {
	if err := os.MkdirAll(config.Path, 0751); err != nil {
		return nil, fmt.Errorf("could not create dbdata directory: %w", err)
	}

	dbPath := filepath.Join(config.Path, "users.db")
	db, err := sqlx.Open("sqlite", dbPath+"?_pragma=foreign_keys(1)&_busy_timeout=3000")
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite database: %w", err)
	}

	return db, nil
}

type HistoryMessage struct {
	ID              int        `json:"id" db:"id"`
	UserID          string     `json:"user_id" db:"user_id"`
	ChatJID         string     `json:"chat_jid" db:"chat_jid"`
	SenderJID       string     `json:"sender_jid" db:"sender_jid"`
	MessageID       string     `json:"message_id" db:"message_id"`
	Timestamp       time.Time  `json:"timestamp" db:"timestamp"`
	MessageType     string     `json:"message_type" db:"message_type"`
	TextContent     string     `json:"text_content" db:"text_content"`
	MediaLink       string     `json:"media_link" db:"media_link"`
	QuotedMessageID string     `json:"quoted_message_id,omitempty" db:"quoted_message_id"`
	DataJson        string     `json:"data_json" db:"datajson"`
	IsFromMe        bool       `json:"is_from_me" db:"is_from_me"`
	IsForwarded     bool       `json:"is_forwarded" db:"is_forwarded"`
	IsEdited        bool       `json:"is_edited" db:"is_edited"`
	IsDeleted       bool       `json:"is_deleted" db:"is_deleted"`
	Reactions       string     `json:"reactions,omitempty" db:"reactions"`
	MediaMimeType   string     `json:"media_mime_type,omitempty" db:"media_mime_type"`
	MediaSize       int64      `json:"media_size,omitempty" db:"media_size"`
	MediaThumbnail  string     `json:"media_thumbnail,omitempty" db:"media_thumbnail"`
	PushName        string     `json:"push_name,omitempty" db:"push_name"`
	Status          string     `json:"status" db:"status"`
}

// Conversation represents a chat conversation for the management panel
type Conversation struct {
	ID                 int        `json:"id" db:"id"`
	UserID             string     `json:"user_id" db:"user_id"`
	ChatJID            string     `json:"chat_jid" db:"chat_jid"`
	Name               string     `json:"name" db:"name"`
	AvatarURL          string     `json:"avatar_url,omitempty" db:"avatar_url"`
	IsGroup            bool       `json:"is_group" db:"is_group"`
	LastMessageID      string     `json:"last_message_id,omitempty" db:"last_message_id"`
	LastMessagePreview string     `json:"last_message_preview,omitempty" db:"last_message_preview"`
	LastMessageAt      *time.Time `json:"last_message_at,omitempty" db:"last_message_at"`
	UnreadCount        int        `json:"unread_count" db:"unread_count"`
	IsMuted            bool       `json:"is_muted" db:"is_muted"`
	IsArchived         bool       `json:"is_archived" db:"is_archived"`
	IsPinned           bool       `json:"is_pinned" db:"is_pinned"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
}

// MessageStatus represents delivery/read status of a message
type MessageStatus struct {
	ID             int       `json:"id" db:"id"`
	MessageID      string    `json:"message_id" db:"message_id"`
	UserID         string    `json:"user_id" db:"user_id"`
	Status         string    `json:"status" db:"status"`
	ParticipantJID string    `json:"participant_jid,omitempty" db:"participant_jid"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

func (s *server) saveMessageToHistory(userID, chatJID, senderJID, messageID, messageType, textContent, mediaLink, quotedMessageID, dataJson string) error {
	query := `INSERT INTO message_history (user_id, chat_jid, sender_jid, message_id, timestamp, message_type, text_content, media_link, quoted_message_id, datajson)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	if s.db.DriverName() == "sqlite" {
		query = `INSERT INTO message_history (user_id, chat_jid, sender_jid, message_id, timestamp, message_type, text_content, media_link, quoted_message_id, datajson)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	}
	_, err := s.db.Exec(query, userID, chatJID, senderJID, messageID, time.Now(), messageType, textContent, mediaLink, quotedMessageID, dataJson)
	if err != nil {
		return fmt.Errorf("failed to save message to history: %w", err)
	}
	return nil
}

func (s *server) trimMessageHistory(userID, chatJID string, limit int) error {
	var queryHistory, querySecrets string

	if s.db.DriverName() == "postgres" {
		queryHistory = `
            DELETE FROM message_history
            WHERE id IN (
                SELECT id FROM message_history
                WHERE user_id = $1 AND chat_jid = $2
                ORDER BY timestamp DESC
                OFFSET $3
            )`

		querySecrets = `
            DELETE FROM whatsmeow_message_secrets
            WHERE message_id IN (
                SELECT id FROM message_history
                WHERE user_id = $1 AND chat_jid = $2
                ORDER BY timestamp DESC
                OFFSET $3
            )`
	} else { // sqlite
		queryHistory = `
            DELETE FROM message_history
            WHERE id IN (
                SELECT id FROM message_history
                WHERE user_id = ? AND chat_jid = ?
                ORDER BY timestamp DESC
                LIMIT -1 OFFSET ?
            )`

		querySecrets = `
            DELETE FROM whatsmeow_message_secrets
            WHERE message_id IN (
                SELECT id FROM message_history
                WHERE user_id = ? AND chat_jid = ?
                ORDER BY timestamp DESC
                LIMIT -1 OFFSET ?
            )`
	}

	if _, err := s.db.Exec(querySecrets, userID, chatJID, limit); err != nil {
		return fmt.Errorf("failed to trim message secrets: %w", err)
	}

	if _, err := s.db.Exec(queryHistory, userID, chatJID, limit); err != nil {
		return fmt.Errorf("failed to trim message history: %w", err)
	}

	return nil
}

// SaveMessageToHistoryExtended saves a message with all extended fields
func (s *server) SaveMessageToHistoryExtended(msg *HistoryMessage) error {
	query := `INSERT INTO message_history
		(user_id, chat_jid, sender_jid, message_id, timestamp, message_type, text_content, media_link,
		 quoted_message_id, datajson, is_from_me, is_forwarded, is_edited, is_deleted, reactions,
		 media_mime_type, media_size, media_thumbnail, push_name, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
		ON CONFLICT (user_id, message_id) DO UPDATE SET
		 is_edited = EXCLUDED.is_edited,
		 is_deleted = EXCLUDED.is_deleted,
		 reactions = EXCLUDED.reactions,
		 status = EXCLUDED.status,
		 text_content = EXCLUDED.text_content`

	if s.db.DriverName() == "sqlite" {
		query = `INSERT INTO message_history
			(user_id, chat_jid, sender_jid, message_id, timestamp, message_type, text_content, media_link,
			 quoted_message_id, datajson, is_from_me, is_forwarded, is_edited, is_deleted, reactions,
			 media_mime_type, media_size, media_thumbnail, push_name, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (user_id, message_id) DO UPDATE SET
			 is_edited = excluded.is_edited,
			 is_deleted = excluded.is_deleted,
			 reactions = excluded.reactions,
			 status = excluded.status,
			 text_content = excluded.text_content`
	}

	_, err := s.db.Exec(query,
		msg.UserID, msg.ChatJID, msg.SenderJID, msg.MessageID, msg.Timestamp, msg.MessageType,
		msg.TextContent, msg.MediaLink, msg.QuotedMessageID, msg.DataJson, msg.IsFromMe, msg.IsForwarded,
		msg.IsEdited, msg.IsDeleted, msg.Reactions, msg.MediaMimeType, msg.MediaSize, msg.MediaThumbnail,
		msg.PushName, msg.Status)

	if err != nil {
		return fmt.Errorf("failed to save message to history: %w", err)
	}
	return nil
}

// GetConversations retrieves all conversations for a user
func (s *server) GetConversations(userID string, includeArchived bool) ([]Conversation, error) {
	var query string
	var args []interface{}

	if s.db.DriverName() == "postgres" {
		if includeArchived {
			query = `SELECT * FROM conversations WHERE user_id = $1
				ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST`
			args = []interface{}{userID}
		} else {
			query = `SELECT * FROM conversations WHERE user_id = $1 AND is_archived = false
				ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST`
			args = []interface{}{userID}
		}
	} else {
		if includeArchived {
			query = `SELECT * FROM conversations WHERE user_id = ?
				ORDER BY is_pinned DESC, last_message_at DESC`
			args = []interface{}{userID}
		} else {
			query = `SELECT * FROM conversations WHERE user_id = ? AND is_archived = 0
				ORDER BY is_pinned DESC, last_message_at DESC`
			args = []interface{}{userID}
		}
	}

	var conversations []Conversation
	err := s.db.Select(&conversations, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversations: %w", err)
	}
	return conversations, nil
}

// GetConversation retrieves a single conversation
func (s *server) GetConversation(userID, chatJID string) (*Conversation, error) {
	query := `SELECT * FROM conversations WHERE user_id = $1 AND chat_jid = $2`
	if s.db.DriverName() == "sqlite" {
		query = `SELECT * FROM conversations WHERE user_id = ? AND chat_jid = ?`
	}

	var conv Conversation
	err := s.db.Get(&conv, query, userID, chatJID)
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

// UpsertConversation creates or updates a conversation
func (s *server) UpsertConversation(conv *Conversation) error {
	query := `INSERT INTO conversations
		(user_id, chat_jid, name, avatar_url, is_group, last_message_id, last_message_preview,
		 last_message_at, unread_count, is_muted, is_archived, is_pinned, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, chat_jid) DO UPDATE SET
		 name = COALESCE(EXCLUDED.name, conversations.name),
		 avatar_url = COALESCE(EXCLUDED.avatar_url, conversations.avatar_url),
		 last_message_id = EXCLUDED.last_message_id,
		 last_message_preview = EXCLUDED.last_message_preview,
		 last_message_at = EXCLUDED.last_message_at,
		 unread_count = conversations.unread_count + EXCLUDED.unread_count,
		 updated_at = CURRENT_TIMESTAMP`

	if s.db.DriverName() == "sqlite" {
		query = `INSERT INTO conversations
			(user_id, chat_jid, name, avatar_url, is_group, last_message_id, last_message_preview,
			 last_message_at, unread_count, is_muted, is_archived, is_pinned, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT (user_id, chat_jid) DO UPDATE SET
			 name = COALESCE(excluded.name, conversations.name),
			 avatar_url = COALESCE(excluded.avatar_url, conversations.avatar_url),
			 last_message_id = excluded.last_message_id,
			 last_message_preview = excluded.last_message_preview,
			 last_message_at = excluded.last_message_at,
			 unread_count = conversations.unread_count + excluded.unread_count,
			 updated_at = CURRENT_TIMESTAMP`
	}

	_, err := s.db.Exec(query,
		conv.UserID, conv.ChatJID, conv.Name, conv.AvatarURL, conv.IsGroup,
		conv.LastMessageID, conv.LastMessagePreview, conv.LastMessageAt,
		conv.UnreadCount, conv.IsMuted, conv.IsArchived, conv.IsPinned)

	if err != nil {
		return fmt.Errorf("failed to upsert conversation: %w", err)
	}
	return nil
}

// UpdateConversationSettings updates mute/archive/pin settings
func (s *server) UpdateConversationSettings(userID, chatJID string, isMuted, isArchived, isPinned *bool) error {
	updates := []string{}
	args := []interface{}{}
	argCount := 1

	if isMuted != nil {
		if s.db.DriverName() == "postgres" {
			updates = append(updates, fmt.Sprintf("is_muted = $%d", argCount))
		} else {
			updates = append(updates, "is_muted = ?")
		}
		args = append(args, *isMuted)
		argCount++
	}
	if isArchived != nil {
		if s.db.DriverName() == "postgres" {
			updates = append(updates, fmt.Sprintf("is_archived = $%d", argCount))
		} else {
			updates = append(updates, "is_archived = ?")
		}
		args = append(args, *isArchived)
		argCount++
	}
	if isPinned != nil {
		if s.db.DriverName() == "postgres" {
			updates = append(updates, fmt.Sprintf("is_pinned = $%d", argCount))
		} else {
			updates = append(updates, "is_pinned = ?")
		}
		args = append(args, *isPinned)
		argCount++
	}

	if len(updates) == 0 {
		return nil
	}

	var query string
	if s.db.DriverName() == "postgres" {
		updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
		query = fmt.Sprintf("UPDATE conversations SET %s WHERE user_id = $%d AND chat_jid = $%d",
			joinStrings(updates, ", "), argCount, argCount+1)
	} else {
		updates = append(updates, "updated_at = CURRENT_TIMESTAMP")
		query = fmt.Sprintf("UPDATE conversations SET %s WHERE user_id = ? AND chat_jid = ?",
			joinStrings(updates, ", "))
	}

	args = append(args, userID, chatJID)
	_, err := s.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update conversation settings: %w", err)
	}
	return nil
}

// ResetUnreadCount resets the unread count for a conversation
func (s *server) ResetUnreadCount(userID, chatJID string) error {
	query := `UPDATE conversations SET unread_count = 0, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND chat_jid = $2`
	if s.db.DriverName() == "sqlite" {
		query = `UPDATE conversations SET unread_count = 0, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? AND chat_jid = ?`
	}

	_, err := s.db.Exec(query, userID, chatJID)
	if err != nil {
		return fmt.Errorf("failed to reset unread count: %w", err)
	}
	return nil
}

// IncrementUnreadCount increments the unread count for a conversation
func (s *server) IncrementUnreadCount(userID, chatJID string) error {
	query := `UPDATE conversations SET unread_count = unread_count + 1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND chat_jid = $2`
	if s.db.DriverName() == "sqlite" {
		query = `UPDATE conversations SET unread_count = unread_count + 1, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? AND chat_jid = ?`
	}

	_, err := s.db.Exec(query, userID, chatJID)
	if err != nil {
		return fmt.Errorf("failed to increment unread count: %w", err)
	}
	return nil
}

// SaveMessageStatus saves or updates the status of a message
func (s *server) SaveMessageStatus(status *MessageStatus) error {
	query := `INSERT INTO message_status (message_id, user_id, status, participant_jid, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		ON CONFLICT (message_id, user_id, COALESCE(participant_jid, '')) DO UPDATE SET
		 status = EXCLUDED.status,
		 updated_at = CURRENT_TIMESTAMP`

	if s.db.DriverName() == "sqlite" {
		query = `INSERT INTO message_status (message_id, user_id, status, participant_jid, updated_at)
			VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT (message_id, user_id, COALESCE(participant_jid, '')) DO UPDATE SET
			 status = excluded.status,
			 updated_at = CURRENT_TIMESTAMP`
	}

	_, err := s.db.Exec(query, status.MessageID, status.UserID, status.Status, status.ParticipantJID)
	if err != nil {
		return fmt.Errorf("failed to save message status: %w", err)
	}
	return nil
}

// GetMessageStatus retrieves the status of a message
func (s *server) GetMessageStatus(messageID, userID string) ([]MessageStatus, error) {
	query := `SELECT * FROM message_status WHERE message_id = $1 AND user_id = $2`
	if s.db.DriverName() == "sqlite" {
		query = `SELECT * FROM message_status WHERE message_id = ? AND user_id = ?`
	}

	var statuses []MessageStatus
	err := s.db.Select(&statuses, query, messageID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get message status: %w", err)
	}
	return statuses, nil
}

// GetMessagesWithPagination retrieves messages with pagination support
func (s *server) GetMessagesWithPagination(userID, chatJID string, limit, offset int) ([]HistoryMessage, error) {
	query := `SELECT * FROM message_history
		WHERE user_id = $1 AND chat_jid = $2 AND is_deleted = false
		ORDER BY timestamp DESC LIMIT $3 OFFSET $4`
	if s.db.DriverName() == "sqlite" {
		query = `SELECT * FROM message_history
			WHERE user_id = ? AND chat_jid = ? AND is_deleted = 0
			ORDER BY timestamp DESC LIMIT ? OFFSET ?`
	}

	var messages []HistoryMessage
	err := s.db.Select(&messages, query, userID, chatJID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	return messages, nil
}

// SearchMessages searches messages by text content
func (s *server) SearchMessages(userID string, searchQuery string, chatJID string, limit int) ([]HistoryMessage, error) {
	var query string
	var args []interface{}

	searchPattern := "%" + searchQuery + "%"

	if chatJID != "" {
		if s.db.DriverName() == "postgres" {
			query = `SELECT * FROM message_history
				WHERE user_id = $1 AND chat_jid = $2 AND text_content ILIKE $3 AND is_deleted = false
				ORDER BY timestamp DESC LIMIT $4`
			args = []interface{}{userID, chatJID, searchPattern, limit}
		} else {
			query = `SELECT * FROM message_history
				WHERE user_id = ? AND chat_jid = ? AND text_content LIKE ? AND is_deleted = 0
				ORDER BY timestamp DESC LIMIT ?`
			args = []interface{}{userID, chatJID, searchPattern, limit}
		}
	} else {
		if s.db.DriverName() == "postgres" {
			query = `SELECT * FROM message_history
				WHERE user_id = $1 AND text_content ILIKE $2 AND is_deleted = false
				ORDER BY timestamp DESC LIMIT $3`
			args = []interface{}{userID, searchPattern, limit}
		} else {
			query = `SELECT * FROM message_history
				WHERE user_id = ? AND text_content LIKE ? AND is_deleted = 0
				ORDER BY timestamp DESC LIMIT ?`
			args = []interface{}{userID, searchPattern, limit}
		}
	}

	var messages []HistoryMessage
	err := s.db.Select(&messages, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search messages: %w", err)
	}
	return messages, nil
}

// GetMessagesSince retrieves messages since a given timestamp (for polling)
func (s *server) GetMessagesSince(userID string, since time.Time, limit int) ([]HistoryMessage, error) {
	query := `SELECT * FROM message_history
		WHERE user_id = $1 AND timestamp > $2
		ORDER BY timestamp ASC LIMIT $3`
	if s.db.DriverName() == "sqlite" {
		query = `SELECT * FROM message_history
			WHERE user_id = ? AND timestamp > ?
			ORDER BY timestamp ASC LIMIT ?`
	}

	var messages []HistoryMessage
	err := s.db.Select(&messages, query, userID, since, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages since: %w", err)
	}
	return messages, nil
}

// UpdateMessageReactions updates the reactions for a message
func (s *server) UpdateMessageReactions(userID, messageID, reactions string) error {
	query := `UPDATE message_history SET reactions = $1 WHERE user_id = $2 AND message_id = $3`
	if s.db.DriverName() == "sqlite" {
		query = `UPDATE message_history SET reactions = ? WHERE user_id = ? AND message_id = ?`
	}

	_, err := s.db.Exec(query, reactions, userID, messageID)
	if err != nil {
		return fmt.Errorf("failed to update message reactions: %w", err)
	}
	return nil
}

// MarkMessageAsDeleted marks a message as deleted (soft delete)
func (s *server) MarkMessageAsDeleted(userID, messageID string) error {
	query := `UPDATE message_history SET is_deleted = true WHERE user_id = $1 AND message_id = $2`
	if s.db.DriverName() == "sqlite" {
		query = `UPDATE message_history SET is_deleted = 1 WHERE user_id = ? AND message_id = ?`
	}

	_, err := s.db.Exec(query, userID, messageID)
	if err != nil {
		return fmt.Errorf("failed to mark message as deleted: %w", err)
	}
	return nil
}

// MarkMessageAsEdited marks a message as edited
func (s *server) MarkMessageAsEdited(userID, messageID, newContent string) error {
	query := `UPDATE message_history SET is_edited = true, text_content = $1
		WHERE user_id = $2 AND message_id = $3`
	if s.db.DriverName() == "sqlite" {
		query = `UPDATE message_history SET is_edited = 1, text_content = ?
			WHERE user_id = ? AND message_id = ?`
	}

	_, err := s.db.Exec(query, newContent, userID, messageID)
	if err != nil {
		return fmt.Errorf("failed to mark message as edited: %w", err)
	}
	return nil
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
