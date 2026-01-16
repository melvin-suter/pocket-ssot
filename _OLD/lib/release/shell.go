package release

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"

	"pocket-ssot/lib/customtypes"

	"github.com/pocketbase/pocketbase/tools/types"
)

func ReleaseShell(
	res *customtypes.StepResult,
	stepOut *[]customtypes.StepResult,
	cfg map[string]any,
	group map[string]any,
	entities []map[string]any,
) {
	cmdTmplStr, _ := cfg["shell"].(string)
	if cmdTmplStr == "" {
		res.Status = false
		res.Error = "shell step missing config.shell"
		res.Meta = map[string]any{"config": cfg}
		*stepOut = append(*stepOut, *res)
		return
	}

	// Optional templated working directory
	workdirTmplStr, _ := cfg["workdir"].(string)

	// Optional eachEntity mode (same semantics as ReleaseTemplate)
	eachEntity, _ := cfg["eachEntity"].(bool)

	// Helper: parse env config into a plain map[string]any
	parseEnvMap := func(raw any) map[string]any {
		if raw == nil {
			return nil
		}
		switch v := raw.(type) {
		case map[string]any:
			return v
		case map[string]string:
			out := make(map[string]any, len(v))
			for k, val := range v {
				out[k] = val
			}
			return out
		case types.JSONRaw:
			var out map[string]any
			if err := json.Unmarshal([]byte(v), &out); err == nil {
				return out
			}
		case []byte:
			var out map[string]any
			if err := json.Unmarshal(v, &out); err == nil {
				return out
			}
		case string:
			// allow env to be provided as a JSON string
			var out map[string]any
			if err := json.Unmarshal([]byte(v), &out); err == nil {
				return out
			}
		}
		return nil
	}

	envMap := parseEnvMap(cfg["env"])

	// Runs a single rendered command with data and accumulates a StepResult
	runOnce := func(data map[string]any, metaBase map[string]any) customtypes.StepResult {
		localRes := customtypes.StepResult{Name: res.Name}

		// Render command
		cmdStr, err := renderTemplate("shell", cmdTmplStr, data)
		if err != nil {
			localRes.Status = false
			localRes.Error = fmt.Sprintf("shell template render failed: %v", err)
			localRes.Meta = map[string]any{"shell": cmdTmplStr}
			return localRes
		}

		// Render workdir (optional)
		workdir := ""
		if workdirTmplStr != "" {
			wd, err := renderTemplate("workdir", workdirTmplStr, data)
			if err != nil {
				localRes.Status = false
				localRes.Error = fmt.Sprintf("workdir template render failed: %v", err)
				localRes.Meta = map[string]any{"workdir": workdirTmplStr}
				return localRes
			}
			workdir = wd
		}

		// Render env (optional)
		env := []string{}
		if envMap != nil {
			for kRaw, vRaw := range envMap {
				// keys can be templated too (cheap + consistent)
				k, err := renderTemplate("envKey", kRaw, data)
				if err != nil {
					localRes.Status = false
					localRes.Error = fmt.Sprintf("env key template render failed: %v", err)
					localRes.Meta = map[string]any{"envKey": kRaw}
					return localRes
				}

				valStr := fmt.Sprintf("%v", vRaw)
				val, err := renderTemplate("envVal", valStr, data)
				if err != nil {
					localRes.Status = false
					localRes.Error = fmt.Sprintf("env value template render failed: %v", err)
					localRes.Meta = map[string]any{"env": map[string]any{kRaw: vRaw}}
					return localRes
				}

				env = append(env, fmt.Sprintf("%s=%s", k, val))
			}
		}

		// Execute: bash -c "<cmdStr>"
		cmd := exec.Command("bash", "-c", cmdStr)
		if workdir != "" {
			cmd.Dir = workdir
		}
		if len(env) > 0 {
			cmd.Env = append(cmd.Environ(), env...)
		}

		var stdout bytes.Buffer
		var stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err = cmd.Run()

		outStr := stdout.String()
		errStr := stderr.String()

		meta := map[string]any{
			"shell":        cmdStr,
			"shellSource":  cmdTmplStr,
			"stdout":       outStr,
			"stderr":       errStr,
			"envRendered":  env,
			"workdir":      workdir,
			"workdirSource": workdirTmplStr,
		}
		// merge base meta (like entity info)
		for k, v := range metaBase {
			meta[k] = v
		}
		localRes.Meta = meta

		if err != nil {
			localRes.Status = false
			localRes.Error = fmt.Sprintf("shell command failed: %v", err)
			localRes.Output = outStr + errStr
			return localRes
		}

		localRes.Status = true
		combined := outStr + errStr
		if combined == "" {
			combined = "ok"
		}
		localRes.Output = combined
		return localRes
	}

	// ---- eachEntity mode ----
	if eachEntity {
		if len(entities) == 0 {
			res.Status = false
			res.Error = "eachEntity is true but entities is empty"
			res.Meta = map[string]any{"config": cfg}
			*stepOut = append(*stepOut, *res)
			return
		}

		success := 0
		failures := []map[string]any{}

		for _, entity := range entities {
			data := map[string]any{
				"group":  group,
				"entity": entity,
			}

			metaBase := map[string]any{"eachEntity": true, "entity": entity}
			r := runOnce(data, metaBase)

			if !r.Status {
				failures = append(failures, map[string]any{
					"entity": entity,
					"error":  r.Error,
					"meta":   r.Meta,
					"output": r.Output,
				})
			} else {
				success++
			}

			*stepOut = append(*stepOut, r)
		}

		if len(failures) > 0 {
			// mark the "parent" res as failed summary (like ReleaseTemplate)
			res.Status = false
			res.Error = fmt.Sprintf("ran %d commands, %d failures", len(entities), len(failures))
			res.Meta = map[string]any{
				"eachEntity": true,
				"success":    success,
				"failures":   failures,
			}
			*stepOut = append(*stepOut, *res)
			return
		}

		res.Status = true
		res.Output = fmt.Sprintf("ran %d commands", success)
		res.Meta = map[string]any{
			"eachEntity": true,
			"success":    success,
		}
		*stepOut = append(*stepOut, *res)
		return
	}

	// ---- normal mode: single command ----
	data := map[string]any{
		"group":    group,
		"entities": entities,
	}

	r := runOnce(data, map[string]any{"eachEntity": false})
	*stepOut = append(*stepOut, r)

	// Mirror the last run result into res for compatibility with callers
	res.Status = r.Status
	res.Error = r.Error
	res.Output = r.Output
	res.Meta = r.Meta
}
