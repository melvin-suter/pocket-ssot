import { useRef, type ReactNode } from "react";

export default function ImportExport({
  setter,
  field,
  name,
  children,
}: {
  setter: (data: any) => void;
  field: any;
  name: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(field)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const importData = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = JSON.parse(text);

    setter([...parsed]);

    // let the same file be chosen again without needing a different one
    e.target.value = "";
  };

  return (
    <div>
      <button type="button" onClick={exportData}>
        Export
      </button>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import
      </button>

      <input
        type="file"
        accept=".txt,.json,.yaml,.yml"
        onChange={importData}
        style={{ display: "none" }}
        ref={inputRef}
      />

      {children}
    </div>
  );
}
