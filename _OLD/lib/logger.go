package lib

import (
	"log/slog"
	"os"
	"strings"
)

var Logger *slog.Logger

func InitLogger() {
	level := slog.LevelInfo

	if v := strings.ToLower(os.Getenv("DEBUG")); v == "1" || v == "true" || v == "yes" {
		level = slog.LevelDebug
	}

	handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	})

	Logger = slog.New(handler)
}
