package lib

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

func GetObjectById(se *core.ServeEvent, table string, id string, jsonFields []string) map[string]any {
	raw, _ := se.App.FindRecordById(table, id)
	m := raw.PublicExport()

	for _, f := range jsonFields {
		var q any
		raw.UnmarshalJSONField(f, &q)
		m[f] = q
	}

	return m
}

func GetAllObjects(
	se *core.ServeEvent,
	table string,
	filter string,
	order string,
	params dbx.Params,
	jsonFields []string,
) []map[string]any {
	raw, _ := se.App.FindRecordsByFilter(
		table,
		filter,
		order,
		0,
		0,
		params,
	)

	result := make([]map[string]any, len(raw))
	for i, r := range raw {
		m := r.PublicExport()
		for _, f := range jsonFields {
			var q any
			r.UnmarshalJSONField(f, &q)
			m[f] = q
		}
		result[i] = m
	}

	return result
}
