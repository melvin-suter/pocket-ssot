import { useEffect, useRef, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import PolicyOrderItem from "../components/policy_order_item";
import { useParams } from "react-router-dom";
import PolicyField from "../components/policy_fields";
import Breadcrumbs from "../components/breadcrumbs";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DndContext } from "@dnd-kit/core";
import { useToasts } from "../services/ToastService";
import ImportExport from "../components/import_export";

export default function Policy() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [policyName, setPolicyName] = useState<string>("");
  const [fields, setFields] = useState<any[]>([]);
  const [showReorder, setShowReorder] = useState(false);
  const [orderingList, setOrderingList] = useState<any[]>([]);
  const { addToast } = useToasts();

  useEffect(() => {
    loadPolicyData();
  }, [id]);

  useEffect(() => {
    if(policy){
      setPolicyName(policy.name);
      setFields((policy.fields ?? []).sort((a:any,b:any) => a.config.order - b.config.order));
    }
  },[policy])

  const loadPolicyData = async () => {
    const data = await apiFetch<any>(`/api/policies/${id}`, {method: "GET"});
    setPolicy(data);
  };

  const savePolicy = async () => {
    const data = await apiFetch<any>(`/api/policies/${id}`, {
      method: "POST",
      body: JSON.stringify({
        name: policyName,
        fields: fields,
      })
    });
    if(data.ok){
      addToast({ message: "Policy updated", type: "success" });
    loadPolicyData();
    } else {
      addToast({ message: "Policy updating failed", type: "error" });
    }
  };

  const updateField = (index:number, value:any) => {
    setFields(prev =>
      prev.map((item, i) =>
        i === index ? value : item
      )
    );
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
              {name: policy?.name},
            ]}/>
            <h1>{policy?.name}</h1>

            <ImportExport setter={setFields} field={fields} name={policy?.name}>  
              <>
                <button type="button" onClick={openReorder}>
                  Reorder
                </button>
              </>
            </ImportExport>
            
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
