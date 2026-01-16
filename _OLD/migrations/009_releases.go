package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// create-or-update pattern
		collection, err := app.FindCollectionByNameOrId("releases")
		if err != nil {
			collection = core.NewBaseCollection("releases")
		}
		groupCol, _ := app.FindCollectionByNameOrId("groups")
		releaseChannelCol, _ := app.FindCollectionByNameOrId("release_channels")


		// auth-only CRUD rules
		authOnly := "@request.auth.id != ''"
		collection.ListRule = types.Pointer(authOnly)
		collection.ViewRule = types.Pointer(authOnly)
		collection.CreateRule = types.Pointer(authOnly)
		collection.UpdateRule = types.Pointer(authOnly)
		collection.DeleteRule = types.Pointer(authOnly)

		// fields
		collection.Fields = core.FieldsList{} // reset to exactly what we define
		collection.Fields.Add(&core.TextField{
			Name:     "name",
			Required: true,
		})
		collection.Fields.Add(&core.JSONField{
			Name:     "out",
			Required: false,
		})
		
		collection.Fields.Add(&core.RelationField{
			Name:         "release_channel",
			CollectionId: releaseChannelCol.Id,
			MaxSelect:    1,
			Required:     true,
		})
		collection.Fields.Add(&core.RelationField{
			Name:         "group",
			CollectionId: groupCol.Id,
			MaxSelect:    1,
			Required:     true,
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("releases")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
