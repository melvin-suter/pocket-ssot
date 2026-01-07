package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	
)

func init() {
	m.Register(func(app core.App) error {
		// create-or-update pattern
		collection, err := app.FindCollectionByNameOrId("groups")
		if err != nil {
			return err
		}
		
		
		collection.Fields.Add(&core.BoolField{
			Name: "allow_host_release",
		})
		
		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("groups")
		if err != nil {
			return err
		}

		f := collection.Fields.GetByName("allow_host_release")
		if f != nil {
			collection.Fields.RemoveById(f.GetId())
		}

		return app.Save(collection)
	})
}
