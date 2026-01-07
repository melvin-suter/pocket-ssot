package main

import (
	"embed"
	"log"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	_ "pocket-ssot/migrations"
	"pocket-ssot/routes"
	"pocket-ssot/lib"
)

// Embed your React build output (Vite: web/dist/*)
//
//go:embed web/dist/*
var embeddedDist embed.FS

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	lib.InitLogger()

	

	dataDir := getenv("PS_DIR", "/var/lib/pocket-ssot")

	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: dataDir,
	})



	args := os.Args[1:]
	if len(args) == 0 {
		args = []string{"serve"}
	}

	app.RootCmd.SetArgs(args)
	
	// Enables "go run . migrate ..." commands (create/up/down/collections snapshot, etc.)
	// Automigrate is handy during dev, not something you want in production surprises.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {


		// 1) Custom API routes
		routes.Register(se)

		// 2) Serve embedded React SPA (index fallback enabled)
		// apis.Static expects a "{path...}" wildcard param.
		fsys := apis.MustSubFS(embeddedDist, "web/dist")
		se.Router.GET("/{path...}", apis.Static(fsys, true))

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
