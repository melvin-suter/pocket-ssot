package customtypes

type StepResult struct {
	Status bool `json:"status"`
	Name   string `json:"name"`
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
	Meta   any    `json:"meta,omitempty"`
}