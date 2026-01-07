import { useEffect, useRef, useState } from "react";
import Navbar from "../components/navbar";
import { api } from "../services/api";
import Modal from "../components/modal";
import PolicyOrderItem from "../components/policy_order_item";
import { useParams } from "react-router-dom";
import PolicyField from "../components/policy_fields";
import Breadcrumbs from "../components/breadcrumbs";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext } from "@dnd-kit/core";
import { useToasts } from "../services/ToastService";

export default function Policy() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [policyName, setPolicyName] = useState<string>("");
  const [fields, setFields] = useState<any[]>([]);
  const [showReorder, setShowReorder] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null)
  const [orderingList, setOrderingList] = useState<any[]>([]);
  const { addToast } = useToasts();

  useEffect(() => {
    loadPolicyData();
  }, [id]);

  useEffect(() => {
    setPolicyName(policy.name);
    setFields((policy.fields ?? []).sort((a:any,b:any) => a.config.order - b.config.order));
    console.log(policy.fields);
  },[policy])

  const loadPolicyData = async () => {
    api.collection("policies").getOne(id!).then(setPolicy)
      .catch((err) => setError(err.message));
  };

  const savePolicy = async () => {
    console.log(fields);
    await api.collection("policies").update(policy.id, {
      name: policyName,
      fields: fields,
    });
    addToast({ message: "Policy updated", type: "success" });
    loadPolicyData();
  };

  const updateField = (index:number, value:any) => {
    setFields(prev =>
      prev.map((item, i) =>
        i === index ? value : item
      )
    );
  };

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(fields)], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a");
    a.href = url;
    a.download = policy.name + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url)
  };

  const importData = async (e:any) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = JSON.parse(text);

    setFields([...parsed]);
  };

  const openReorder = () => {
    let c = 0;
    setOrderingList(
      [...fields] // copy first
        .sort((a: any, b: any) => a.config.order - b.config.order)
        .map((f: any, index: number) => ({
          name: f.name,
          key: f.name,   // stable identity
          id: index,     // order index
        }))
    );
    setShowReorder(true);
  };

  const saveOrderedList = () => {
    const orderMap = new Map(
      orderingList.map(item => [item.name, item.id])
    );
    let newFields = [...fields];

    for (const field of newFields) {
      const newOrder = orderMap.get(field.name);
      if (newOrder !== undefined) {
        field.config.order = newOrder;
      }
    }

    setFields(newFields);
    setShowReorder(false);
  }

  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/policies", name: "Policies"},
              {name: policy.name},
            ]}/>
            <h1>{policy.name}</h1>

            <p>
              <button onClick={exportData}>Export</button>
              <button onClick={() => inputRef.current?.click()}>Import</button>
              <button onClick={openReorder}>Reorder</button>
            </p>

            <input
              type="file"
              accept=".txt,.json,.yaml,.yml"
              onChange={importData}
              style={{display: "none"}}
              ref={inputRef}
            />
            
            <label>Name</label>
            <input type="text" value={policyName} onChange={(e) => setPolicyName(e.target.value)}/>
            
            <button onClick={() => setFields([...fields, {name: "name", label: "Label", type:"string", config: {order: fields.length + 1}}])}>Add Field</button>
            <div>
              {fields.map((field:any, i:number) => (
                <PolicyField deleteEmit={() => setFields(fields.filter((_i:any, li:number) => li != i))} emit={(data) => updateField(i, data)} config={field}/>
              ))}
            </div>

            <button style={{marginTop: "1rem"}} onClick={savePolicy}>Save</button>
          </main>

          {showReorder ? (
            <Modal header="Reorder">
              <DndContext
                onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return;

                  setOrderingList((items) => {
                    const oldIndex = items.findIndex((x) => x.key === active.id);
                    const newIndex = items.findIndex((x) => x.key === over.id);
                    if (oldIndex === -1 || newIndex === -1) return items;

                    // 1) reorder items (THIS changes visual order)
                    const moved = arrayMove(items, oldIndex, newIndex);

                    // 2) reassign id based on new position (THIS changes your ids)
                    return moved.map((item, index) => ({
                      ...item,
                      id: index + 1, // or whatever your order scheme is
                    }));
                  });
                }}
              >
                {/* SortableContext.items must be the SAME ids used by useSortable */}
                <SortableContext
                  items={orderingList.map((x) => x.key)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderingList.map((item) => (
                    <PolicyOrderItem key={item.key} dndId={item.key} name={item.name} id={item.id} />
                  ))}
                </SortableContext>
              </DndContext>

              <button onClick={saveOrderedList}>Save</button>
              <button onClick={() => setShowReorder(false)}>Close</button>
            </Modal>
          ) :(null)}
      </>
  );
}
