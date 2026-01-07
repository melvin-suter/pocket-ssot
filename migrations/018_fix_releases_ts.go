package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		col, err := app.FindCollectionByNameOrId("releases") // or whatever
		if err != nil {
			return err
		}

		// Add created
		if col.Fields.GetByName("created") == nil {
			col.Fields.Add(&core.AutodateField{
				Name:     "created",
				OnCreate: true,
			})
		}

		// Add updated
		if col.Fields.GetByName("updated") == nil {
			col.Fields.Add(&core.AutodateField{
				Name:     "updated",
				OnCreate: true,
				OnUpdate: true,
			})
		}

		return app.Save(col)
	}, func(app core.App) error {
		col, err := app.FindCollectionByNameOrId("releases")
		if err != nil {
			return err
		}

		if f := col.Fields.GetByName("updated"); f != nil {
			col.Fields.RemoveById(f.GetId())
		}
		if f := col.Fields.GetByName("created"); f != nil {
			col.Fields.RemoveById(f.GetId())
		}

		return app.Save(col)
	})
}
