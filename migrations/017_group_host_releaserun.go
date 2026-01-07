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
		releaseChannelCol, _ := app.FindCollectionByNameOrId("release_channels")
		
		
		collection.Fields.Add(&core.RelationField{
			Name:         "release_channel_entity",
			CollectionId: releaseChannelCol.Id,
			MaxSelect:    1,
			Required:     false,
		})
		
		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("groups")
		if err != nil {
			return err
		}

		f := collection.Fields.GetByName("release_channel_entity")
		if f != nil {
			collection.Fields.RemoveById(f.GetId())
		}

		return app.Save(collection)
	})
}
