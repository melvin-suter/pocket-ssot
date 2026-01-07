package release

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"text/template"

	"pocket-ssot/lib/customtypes"

	"github.com/Masterminds/sprig/v3"
)

func renderTemplate(name string, tmplStr string, data any) (string, error) {
	tpl, err := template.New(name).
		Funcs(sprig.FuncMap()).
		Parse(tmplStr)
	if err != nil {
		return "", err
	}

	var out bytes.Buffer
	if err := tpl.Execute(&out, data); err != nil {
		return "", err
	}

	return out.String(), nil
}

func ensureDir(target string) error {
	if dir := filepath.Dir(target); dir != "." && dir != "/" {
		return os.MkdirAll(dir, 0o755)
	}
	return nil
}

func writeFile(target string, content string) error {
	if err := ensureDir(target); err != nil {
		return err
	}
	return os.WriteFile(target, []byte(content), 0o644)
}

func ReleaseTemplate(
	res *customtypes.StepResult,
	stepOut *[]customtypes.StepResult,
	cfg map[string]any,
	group map[string]any,
	entities []map[string]any,
) {
	tmplStr, _ := cfg["template"].(string)
	pathTmplStr, _ := cfg["path"].(string)
	eachEntity, _ := cfg["eachEntity"].(bool)

	if pathTmplStr == "" {
		res.Status = false
		res.Error = "template step missing config.path"
		res.Meta = map[string]any{"config": cfg}
		*stepOut = append(*stepOut, *res)
		return
	}
	if tmplStr == "" {
		res.Status = false
		res.Error = "template step missing config.template"
		res.Meta = map[string]any{"config": cfg}
		*stepOut = append(*stepOut, *res)
		return
	}

	// ---- eachEntity mode: one file per entity ----
	if eachEntity {
		if len(entities) == 0 {
			res.Status = false
			res.Error = "eachEntity is true but entities is empty"
			res.Meta = map[string]any{"config": cfg}
			*stepOut = append(*stepOut, *res)
			return
		}

		wrote := 0
		errors := []map[string]any{}

		for _, entity := range entities {
			data := map[string]any{
				"group":  group,
				"entity": entity,
			}

			// Resolve path per entity (path is a template now)
			target, err := renderTemplate("path", pathTmplStr, data)
			if err != nil {
				errors = append(errors, map[string]any{
					"entity": entity,
					"error":  fmt.Sprintf("path template render failed: %v", err),
				})
				continue
			}
			target = filepath.Clean(target)
			if target == "" || target == "." || target == "/" {
				errors = append(errors, map[string]any{
					"entity": entity,
					"error":  "resolved path is empty/invalid",
					"path":   target,
				})
				continue
			}

			// Render content per entity
			rendered, err := renderTemplate(filepath.Base(target), tmplStr, data)
			if err != nil {
				errors = append(errors, map[string]any{
					"entity": entity,
					"error":  fmt.Sprintf("content template render failed: %v", err),
					"path":   target,
				})
				continue
			}

			if err := writeFile(target, rendered); err != nil {
				errors = append(errors, map[string]any{
					"entity": entity,
					"error":  fmt.Sprintf("failed to write file: %v", err),
					"path":   target,
				})
				continue
			}

			wrote++
		}

		if len(errors) > 0 {
			res.Status = false
			res.Error = fmt.Sprintf("wrote %d files, %d failures", wrote, len(errors))
			res.Meta = map[string]any{
				"eachEntity": true,
				"written":    wrote,
				"failures":   errors,
			}
			*stepOut = append(*stepOut, *res)
			return
		}

		res.Status = true
		res.Output = fmt.Sprintf("wrote %d files", wrote)
		res.Meta = map[string]any{
			"eachEntity": true,
			"written":    wrote,
		}
		*stepOut = append(*stepOut, *res)
		return
	}

	// ---- normal mode: single file ----
	data := map[string]any{
		"group":    group,
		"entities": entities,
	}

	// Resolve path once (also treated as a template)
	target, err := renderTemplate("path", pathTmplStr, data)
	if err != nil {
		res.Status = false
		res.Error = fmt.Sprintf("path template render failed: %v", err)
		res.Meta = map[string]any{"path": pathTmplStr}
		*stepOut = append(*stepOut, *res)
		return
	}
	target = filepath.Clean(target)
	if target == "" || target == "." || target == "/" {
		res.Status = false
		res.Error = "resolved path is empty/invalid"
		res.Meta = map[string]any{"path": target}
		*stepOut = append(*stepOut, *res)
		return
	}

	// Render content
	rendered, err := renderTemplate(filepath.Base(target), tmplStr, data)
	if err != nil {
		res.Status = false
		res.Error = fmt.Sprintf("template render failed: %v", err)
		res.Meta = map[string]any{"path": target}
		*stepOut = append(*stepOut, *res)
		return
	}

	// Write file
	if err := writeFile(target, rendered); err != nil {
		res.Status = false
		res.Error = fmt.Sprintf("failed to write file: %v", err)
		res.Meta = map[string]any{
			"path":     target,
			"rendered": rendered,
		}
		*stepOut = append(*stepOut, *res)
		return
	}

	// Success
	res.Status = true
	res.Output = fmt.Sprintf("wrote %d bytes to %s", len(rendered), target)
	res.Meta = map[string]any{
		"path":     target,
		"rendered": rendered,
	}
	*stepOut = append(*stepOut, *res)
}
