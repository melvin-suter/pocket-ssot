package migrations

import (
	"os"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		email := "admin@localhost.local"//os.Getenv("BOOTSTRAP_USERNAME")
		password := os.Getenv("BOOTSTRAP_USER_PASSWORD")

		// fallback defaults (yes, insecure, you asked for it)
		/*if email == "" {
			email = "admin@localhost.local"
		} else {
			email = email + "@localhost.local"
		}*/
		if password == "" {
			password = "ssotadmin"
		}

		// don't recreate if it already exists
		if existing, _ := app.FindAuthRecordByEmail("users", email); existing != nil {
			return nil
		}

		usersCol, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		user := core.NewRecord(usersCol)
		user.Set("email", email)
		user.Set("password", password)
		user.Set("passwordConfirm", password)

		return app.Save(user)
	}, nil)
}
