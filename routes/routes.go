package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"strings"

	"pocket-ssot/lib"
	"pocket-ssot/lib/customtypes"
	"pocket-ssot/lib/release"
	"github.com/pocketbase/pocketbase/apis"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func Register(se *core.ServeEvent) {
	se.Router.POST("/api/change-email", func(e *core.RequestEvent) error {
		// require auth (also covered by the middleware below, but redundancy is free)
		if e.Auth == nil {
			return e.UnauthorizedError("authentication required", nil)
		}

		data := struct {
			Email string `json:"email" form:"email"`
		}{}

		if err := e.BindBody(&data); err != nil {
			return e.BadRequestError("failed to read request data", err)
		}

		data.Email = strings.TrimSpace(data.Email)
		if data.Email == "" {
			return e.BadRequestError("email is required", nil)
		}

		// load the auth record fresh (don’t blindly mutate e.Auth)
		user, err := se.App.FindRecordById("users", e.Auth.Id)
		if err != nil {
			return e.NotFoundError("user not found", err)
		}


		user.Set("email", data.Email)

		if err := e.App.Save(user); err != nil {
			return e.BadRequestError("failed to update email", err)
		}

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).
	Bind(apis.RequireAuth())


	se.Router.POST("/api/callback/{entityid}/{field}", func(e *core.RequestEvent) error {
		return lib.RunCallback(e)
	})

	se.Router.POST("/api/release/{groupId}", func(e *core.RequestEvent) error {
		groupId := e.Request.PathValue("groupId")
		if groupId == "" {
			return e.BadRequestError("missing groupId", nil)
		}
		if e.Auth == nil {
			return e.UnauthorizedError("authentication required", nil)
		}

		lib.Logger.Info("release start (group)",
			"groupId", groupId,
			"user", e.Auth.Id,
		)

		group := lib.GetObjectById(se, "groups", groupId, []string{})
		if group == nil {
			lib.Logger.Warn("group not found", "groupId", groupId)
			return e.NotFoundError("group not found", nil)
		}

		rcId, _ := group["release_channel"].(string)
		if rcId == "" {
			lib.Logger.Warn("group has no release_channel", "groupId", groupId)
			return e.BadRequestError("group has no release_channel", nil)
		}

		entities := lib.GetAllObjects(
			se,
			"entities",
			`group = {:gid}`,
			"name",
			dbx.Params{"gid": groupId},
			[]string{"fields"},
		)

		releaseChannel := lib.GetObjectById(se, "release_channels", rcId, []string{})
		if releaseChannel == nil {
			lib.Logger.Warn("release_channel not found", "releaseChannelId", rcId, "groupId", groupId)
			return e.NotFoundError("release_channel not found", nil)
		}

		releaseSteps := lib.GetAllObjects(
			se,
			"release_steps",
			`release_channel = {:rid}`,
			"order",
			dbx.Params{"rid": rcId},
			[]string{},
		)

		lib.Logger.Info("release resolved config (group)",
			"groupId", groupId,
			"releaseChannelId", rcId,
			"entityCount", len(entities),
			"stepCount", len(releaseSteps),
		)

		releasesCol, err := se.App.FindCollectionByNameOrId("releases")
		if err != nil {
			lib.Logger.Error("failed to load releases collection", "error", err)
			return e.InternalServerError("failed to load releases collection", err)
		}

		groupName, _ := group["name"].(string)
		rcName, _ := releaseChannel["name"].(string)
		releaseName := fmt.Sprintf("%s / %s / %s", groupName, rcName, time.Now().Format(time.RFC3339))

		releaseRec := core.NewRecord(releasesCol)
		releaseRec.Set("name", releaseName)
		releaseRec.Set("group", groupId)
		releaseRec.Set("release_channel", rcId)

		stepOut := make([]customtypes.StepResult, 0, len(releaseSteps))

		if err := se.App.Save(releaseRec); err != nil {
			lib.Logger.Error("failed to create release record", "error", err)
			return e.InternalServerError("failed to create release record", err)
		}

		lib.Logger.Info("release record created (group)",
			"releaseId", releaseRec.Id,
			"name", releaseName,
		)

		for i, step := range releaseSteps {
			lib.Logger.Debug("step start (group)",
				"index", i,
				"releaseId", releaseRec.Id,
			)

			stepType, _ := step["type"].(string)
			stepName, _ := step["name"].(string)
			if stepName == "" {
				if id, _ := step["id"].(string); id != "" {
					stepName = id
				} else {
					stepName = stepType
				}
			}

			lib.Logger.Debug("step metadata (group)",
				"index", i,
				"stepName", stepName,
				"stepType", stepType,
			)

			// IMPORTANT: Start as "successful so far"
			res := customtypes.StepResult{
				Name:   stepName,
				Status: true,
			}

			cfgVal := step["config"]
			lib.Logger.Debug("step config raw (group)",
				"stepName", stepName,
				"rawType", fmt.Sprintf("%T", cfgVal),
			)

			var cfg map[string]any

			switch v := cfgVal.(type) {
			case map[string]any:
				cfg = v
			case types.JSONRaw:
				if err := json.Unmarshal([]byte(v), &cfg); err != nil {
					lib.Logger.Error("config JSONRaw unmarshal failed (group)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config JSONRaw unmarshal failed: %v", err)
				}
			case []byte:
				if err := json.Unmarshal(v, &cfg); err != nil {
					lib.Logger.Error("config []byte unmarshal failed (group)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config []byte unmarshal failed: %v", err)
				}
			case string:
				if err := json.Unmarshal([]byte(v), &cfg); err != nil {
					lib.Logger.Error("config string unmarshal failed (group)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config string unmarshal failed: %v", err)
				}
			default:
				lib.Logger.Error("step config has unexpected type (group)",
					"stepName", stepName,
					"type", fmt.Sprintf("%T", cfgVal),
				)
				res.Status = false
				res.Error = "step config has unexpected type"
				res.Meta = map[string]any{"configType": fmt.Sprintf("%T", cfgVal)}
			}

			if !res.Status {
				lib.Logger.Warn("aborting release: config failed (group)",
					"stepName", stepName,
					"releaseId", releaseRec.Id,
					"error", res.Error,
				)
				stepOut = append(stepOut, res)
				break
			}

			lib.Logger.Debug("executing step (group)",
				"stepName", stepName,
				"stepType", stepType,
				"releaseId", releaseRec.Id,
			)

			switch stepType {
			case "template":
				release.ReleaseTemplate(&res, &stepOut, cfg, group, entities)
				if !res.Status {
					lib.Logger.Warn("step failed (group)",
						"stepName", stepName,
						"releaseId", releaseRec.Id,
						"error", res.Error,
					)
				}
			case "shell":
				release.ReleaseShell(&res, &stepOut, cfg, group, entities)
				if !res.Status {
					lib.Logger.Warn("step failed (group)",
						"stepName", stepName,
						"releaseId", releaseRec.Id,
						"error", res.Error,
					)
				}
			default:
				res.Status = true
				res.Output = "skipped (unsupported step type)"
				res.Meta = map[string]any{"type": stepType}
				lib.Logger.Info("skipping unsupported step type (group)",
					"stepName", stepName,
					"stepType", stepType,
					"releaseId", releaseRec.Id,
				)
			}

			// Ensure one result per step (even if Release* appended internally, this still keeps a top-level trace)
			stepOut = append(stepOut, res)

			lib.Logger.Debug("step finished (group)",
				"stepName", stepName,
				"releaseId", releaseRec.Id,
				"status", res.Status,
				"error", res.Error,
			)

			if !res.Status {
				lib.Logger.Warn("aborting release: step failed (group)",
					"stepName", stepName,
					"releaseId", releaseRec.Id,
				)
				break
			}
		}

		releaseRec.Set("out", stepOut)
		if err := se.App.Save(releaseRec); err != nil {
			lib.Logger.Error("failed to update release record (group)",
				"releaseId", releaseRec.Id,
				"error", err,
			)
			return e.InternalServerError("failed to update release record", err)
		}

		ok := true
		for _, s := range stepOut {
			if !s.Status {
				ok = false
				break
			}
		}

		lib.Logger.Info("release finished (group)",
			"groupId", groupId,
			"releaseId", releaseRec.Id,
			"ok", ok,
			"stepCount", len(stepOut),
		)

		return e.JSON(http.StatusOK, map[string]any{
			"ok":         ok,
			"group_id":   groupId,
			"release_id": releaseRec.Id,
			"name":       releaseName,
			"out":        stepOut,
		})
	})

	se.Router.POST("/api/release-entity/{entityId}", func(e *core.RequestEvent) error {
		entityId := e.Request.PathValue("entityId")
		if entityId == "" {
			return e.BadRequestError("missing entityId", nil)
		}
		if e.Auth == nil {
			return e.UnauthorizedError("authentication required", nil)
		}

		lib.Logger.Info("release start (entity)",
			"entityId", entityId,
			"user", e.Auth.Id,
		)

		entity := lib.GetObjectById(se, "entities", entityId, []string{"fields"})
		if entity == nil {
			lib.Logger.Warn("entity not found", "entityId", entityId)
			return e.NotFoundError("entity not found", nil)
		}

		groupId, _ := entity["group"].(string)
		if groupId == "" {
			lib.Logger.Warn("entity has no group", "entityId", entityId)
			return e.BadRequestError("entity has no group", nil)
		}

		group := lib.GetObjectById(se, "groups", groupId, []string{})
		if group == nil {
			lib.Logger.Warn("group not found", "groupId", groupId)
			return e.NotFoundError("group not found", nil)
		}

		rcId, _ := group["release_channel_entity"].(string)
		if rcId == "" {
			lib.Logger.Warn("group has no release_channel_entity", "groupId", groupId)
			return e.BadRequestError("group has no release_channel_entity", nil)
		}

		entities := []map[string]any{entity}

		releaseChannel := lib.GetObjectById(se, "release_channels", rcId, []string{})
		if releaseChannel == nil {
			lib.Logger.Warn("release_channel not found", "releaseChannelId", rcId, "groupId", groupId)
			return e.NotFoundError("release_channel not found", nil)
		}

		releaseSteps := lib.GetAllObjects(
			se,
			"release_steps",
			`release_channel = {:rid}`,
			"order",
			dbx.Params{"rid": rcId},
			[]string{},
		)

		lib.Logger.Info("release resolved config (entity)",
			"entityId", entityId,
			"groupId", groupId,
			"releaseChannelId", rcId,
			"stepCount", len(releaseSteps),
		)

		releasesCol, err := se.App.FindCollectionByNameOrId("releases_entity")
		if err != nil {
			lib.Logger.Error("failed to load releases_entity collection", "error", err)
			return e.InternalServerError("failed to load releases collection", err)
		}

		groupName, _ := group["name"].(string)
		rcName, _ := releaseChannel["name"].(string)
		entityName, _ := entity["name"].(string)
		if entityName == "" {
			entityName = entityId
		}

		releaseName := fmt.Sprintf(
			"%s / %s / %s / %s",
			groupName,
			rcName,
			entityName,
			time.Now().Format(time.RFC3339),
		)

		releaseRec := core.NewRecord(releasesCol)
		releaseRec.Set("name", releaseName)
		releaseRec.Set("entity", entityId)
		releaseRec.Set("release_channel", rcId)

		stepOut := make([]customtypes.StepResult, 0, len(releaseSteps))

		if err := se.App.Save(releaseRec); err != nil {
			lib.Logger.Error("failed to create release record (entity)",
				"error", err,
			)
			return e.InternalServerError("failed to create release record", err)
		}

		lib.Logger.Info("release record created (entity)",
			"releaseId", releaseRec.Id,
			"name", releaseName,
		)

		for i, step := range releaseSteps {
			lib.Logger.Debug("step start (entity)",
				"index", i,
				"releaseId", releaseRec.Id,
			)

			stepType, _ := step["type"].(string)

			stepName, _ := step["name"].(string)
			if stepName == "" {
				if id, _ := step["id"].(string); id != "" {
					stepName = id
				} else {
					stepName = stepType
				}
			}

			lib.Logger.Debug("step metadata (entity)",
				"index", i,
				"stepName", stepName,
				"stepType", stepType,
			)

			res := customtypes.StepResult{
				Name:   stepName,
				Status: true,
			}

			cfgVal := step["config"]
			lib.Logger.Debug("step config raw (entity)",
				"stepName", stepName,
				"rawType", fmt.Sprintf("%T", cfgVal),
			)

			var cfg map[string]any

			switch v := cfgVal.(type) {
			case map[string]any:
				cfg = v
			case types.JSONRaw:
				if err := json.Unmarshal([]byte(v), &cfg); err != nil {
					lib.Logger.Error("config JSONRaw unmarshal failed (entity)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config JSONRaw unmarshal failed: %v", err)
				}
			case []byte:
				if err := json.Unmarshal(v, &cfg); err != nil {
					lib.Logger.Error("config []byte unmarshal failed (entity)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config []byte unmarshal failed: %v", err)
				}
			case string:
				if err := json.Unmarshal([]byte(v), &cfg); err != nil {
					lib.Logger.Error("config string unmarshal failed (entity)",
						"stepName", stepName,
						"error", err,
					)
					res.Status = false
					res.Error = fmt.Sprintf("config string unmarshal failed: %v", err)
				}
			default:
				lib.Logger.Error("step config has unexpected type (entity)",
					"stepName", stepName,
					"type", fmt.Sprintf("%T", cfgVal),
				)
				res.Status = false
				res.Error = "step config has unexpected type"
				res.Meta = map[string]any{"configType": fmt.Sprintf("%T", cfgVal)}
			}

			if !res.Status {
				lib.Logger.Warn("aborting release: config failed (entity)",
					"stepName", stepName,
					"releaseId", releaseRec.Id,
					"error", res.Error,
				)
				stepOut = append(stepOut, res)
				break
			}

			lib.Logger.Debug("executing step (entity)",
				"stepName", stepName,
				"stepType", stepType,
				"releaseId", releaseRec.Id,
			)

			switch stepType {
			case "template":
				release.ReleaseTemplate(&res, &stepOut, cfg, group, entities)
				if !res.Status {
					lib.Logger.Warn("step failed (entity)",
						"stepName", stepName,
						"releaseId", releaseRec.Id,
						"error", res.Error,
					)
				}
			case "shell":
				release.ReleaseShell(&res, &stepOut, cfg, group, entities)
				if !res.Status {
					lib.Logger.Warn("step failed (entity)",
						"stepName", stepName,
						"releaseId", releaseRec.Id,
						"error", res.Error,
					)
				}
			default:
				res.Status = true
				res.Output = "skipped (unsupported step type)"
				res.Meta = map[string]any{"type": stepType}
				lib.Logger.Info("skipping unsupported step type (entity)",
					"stepName", stepName,
					"stepType", stepType,
					"releaseId", releaseRec.Id,
				)
			}

			stepOut = append(stepOut, res)

			lib.Logger.Debug("step finished (entity)",
				"stepName", stepName,
				"releaseId", releaseRec.Id,
				"status", res.Status,
				"error", res.Error,
			)

			if !res.Status {
				lib.Logger.Warn("aborting release: step failed (entity)",
					"stepName", stepName,
					"releaseId", releaseRec.Id,
				)
				break
			}
		}

		releaseRec.Set("out", stepOut)
		if err := se.App.Save(releaseRec); err != nil {
			lib.Logger.Error("failed to update release record (entity)",
				"releaseId", releaseRec.Id,
				"error", err,
			)
			return e.InternalServerError("failed to update release record", err)
		}

		ok := true
		for _, s := range stepOut {
			if !s.Status {
				ok = false
				break
			}
		}

		lib.Logger.Info("release finished (entity)",
			"entityId", entityId,
			"groupId", groupId,
			"releaseId", releaseRec.Id,
			"ok", ok,
			"stepCount", len(stepOut),
		)

		return e.JSON(http.StatusOK, map[string]any{
			"ok":         ok,
			"entity_id":  entityId,
			"group_id":   groupId,
			"release_id": releaseRec.Id,
			"name":       releaseName,
			"out":        stepOut,
		})
	})
}
