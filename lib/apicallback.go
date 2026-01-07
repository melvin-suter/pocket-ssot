package lib

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

type PolicyFieldDef struct {
	Name   string `json:"name"`
	Config struct {
		APICallback *bool `json:"apiCallback,omitempty"`
	} `json:"config"`
}

func decodeRecordJSONSlice[T any](rec *core.Record, field string) ([]T, error) {
	raw := rec.Get(field)
	if raw == nil {
		return []T{}, nil
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return nil, err
	}
	var out []T
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func readCallbackValue(r *http.Request) (any, error) {
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	s := strings.TrimSpace(string(bodyBytes))
	if s == "" {
		return "", nil
	}

	if strings.HasPrefix(s, "{") || strings.HasPrefix(s, "[") || strings.HasPrefix(s, "\"") {
		var obj map[string]any
		if err := json.Unmarshal(bodyBytes, &obj); err == nil {
			if v, ok := obj["value"]; ok {
				return v, nil
			}
			return obj, nil
		}

		var asString string
		if err := json.Unmarshal(bodyBytes, &asString); err == nil {
			return asString, nil
		}
	}

	return s, nil
}

func RunCallback(e *core.RequestEvent) error {
	entityID := e.Request.PathValue("entityid")
	fieldName := e.Request.PathValue("field")
	if entityID == "" || fieldName == "" {
		return apis.NewBadRequestError("Missing entityid or field path param.", nil)
	}

	// 1) entity
	entity, err := e.App.FindRecordById("entities", entityID)
	if err != nil {
		return apis.NewNotFoundError("Entity not found.", err)
	}

	// 2) group
	groupID := entity.GetString("group")
	if groupID == "" {
		return apis.NewBadRequestError("Entity has no group.", nil)
	}

	group, err := e.App.FindRecordById("groups", groupID)
	if err != nil {
		return apis.NewBadRequestError("Group not found for entity.", err)
	}

	// 3) policies in group
	policyIDs := group.GetStringSlice("policies")
	if len(policyIDs) == 0 {
		return apis.NewForbiddenError("No policies configured for this group.", nil)
	}

	// 4) find matching policy field + apiCallback enabled
	allowed := false
	for _, pid := range policyIDs {
		policy, err := e.App.FindRecordById("policies", pid)
		if err != nil {
			continue
		}

		defs, err := decodeRecordJSONSlice[PolicyFieldDef](policy, "fields")
		if err != nil {
			return apis.NewBadRequestError("Invalid policy.fields JSON.", err)
		}

		for _, def := range defs {
			if def.Name != fieldName {
				continue
			}
			if def.Config.APICallback != nil && *def.Config.APICallback {
				allowed = true
			}
			break
		}

		if allowed {
			break
		}
	}

	if !allowed {
		return apis.NewForbiddenError("apiCallback disabled for this field.", map[string]any{
			"field": fieldName,
		})
	}

	// 5) read post body value
	value, err := readCallbackValue(e.Request)
	if err != nil {
		return apis.NewBadRequestError("Failed reading request body.", err)
	}

	// 6) update entity.fields (JSON object/map)
	rawFields := entity.Get("fields")
	fieldsMap := map[string]any{}

	if rawFields != nil {
		b, err := json.Marshal(rawFields)
		if err != nil {
			return apis.NewBadRequestError("Invalid entity.fields JSON.", err)
		}
		if err := json.Unmarshal(b, &fieldsMap); err != nil {
			return apis.NewBadRequestError("Invalid entity.fields JSON.", err)
		}
	}

	fieldsMap[fieldName] = value
	entity.Set("fields", fieldsMap)

	// 7) save
	if err := e.App.Save(entity); err != nil {
		return apis.NewBadRequestError("Failed to save entity.", err)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"success":  true,
		"entityId": entityID,
		"field":    fieldName,
		"value":    value,
	})
}
