import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link, useParams } from "react-router-dom";
import EntityField from "../components/entity_field";
import Breadcrumbs from "../components/breadcrumbs";
import { useToasts } from "../services/ToastService";
import ImportExport from "../components/import_export";

export default function Entity() {
  const { addToast } = useToasts();
  const { id } = useParams<{ id: string }>();
  const [entity, setEntity] = useState<any>(undefined);
  const [policies, setPolicies] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<any>({});
  const [entityName, setEntityName] = useState<string>("");
  const [fieldStates, setFieldStates] = useState<any>({});
  const [group, setGroup] = useState<any>({});
  
  useEffect(() => {
    loadEntityData();
  }, [id]);

  useEffect(() => {
    if(entity != undefined){
      setEntityName(entity.name);
      setFields(entity.fields ?? {});
      
      loadGroupData();
    }
  },[entity])

  useEffect( () => {
    if(entity != undefined){
      loadPolicies();
    }
  },[group]);

  const loadPolicies = async () => {
    let policies:any[] = [];
    for(let policyId of group.policies) {
      const data = await apiFetch<any>(`/api/policies/${policyId}`, {method: "GET"});
      policies.push(data);
    }
    setPolicies(policies);
  };

  const loadGroupData = async () => {
    const data = await apiFetch<any>(`/api/collections/${entity.collectionId}`, {method: "GET"});
    setGroup(data);
  };

  const loadEntityData = async () => {
    const data = await apiFetch<any>(`/api/entities/${id}`, {method: "GET"});
    setEntity(data);
  };


  const saveEntity = async () => {

    const data = await apiFetch<any>(`/api/entities/${id}`, {
      method: "POST",
      body: JSON.stringify({
        name: entityName,
        fields: fields,
      })
    });
    if(data.ok){
      addToast({ message: "Entity updated", type: "success" });
    loadEntityData();
    } else {
      addToast({ message: "Entity updating failed", type: "error" });
    }
  };

  const updateFieldEmit = (name: string, value: any, state: boolean) => {
    setFields({...fields, ...{[name]: value}});
    setFieldStates({...fieldStates, ...{[name]: state}});
  }

  const startRelease = async () => {
    const res = await fetch(`/api/release-entity/${entity.id}`, {
      method: "POST",
      headers: {
        Authorization: api.authStore.token,
      },
    });

    if (!res.ok) {
      addToast({ message: await res.text(), type: "error" });
      throw new Error(await res.text());
    } else {
      addToast({ message: "Release started", type: "success" });
    }

  };

  return (
      <>
          <Navbar/>
          <main className="container">
            {entity ? (
              <>
                <Breadcrumbs crumbs={[
                  {to: "/", name: "Collections"},
                  {to: "/collections/" + group.id, name: group.name},
                  {name: entity.name},
                ]}/>
                
                <h1>{entity?.name}</h1>

                <ImportExport setter={setFields} field={fields} name={entity?.name}/>
                

                {group.allow_host_release ? (
                  <>
                    <button onClick={startRelease}>Release</button>
                    <Link to={"/entities/" + id + "/releases"}>Show Releases</Link>
                  </>
                ) : (null)}
                
                <form>
                  <details>
                    <summary role="button">Config</summary>
                    <label>ID</label>
                    <input type="text" defaultValue={entity?.id} disabled={true} readOnly={true}/>
                    <label>Collection</label>
                    <input type="text" defaultValue={entity?.expand?.group?.name} disabled={true} readOnly={true}/>
                    
                    <label>Name</label>
                    <input type="text" value={entityName} onChange={(e) => setEntityName(e.target.value)}/>

                  </details>
                  
                  <div style={{display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "1rem"}}>
                    {policies.map((policy:any) => (
                      <>
                        {(policy.fields ?? []).sort((a:any, b:any) => a.config.order - b.config.order).map((field:any) => (
                          <>
                            <EntityField emit={updateFieldEmit} currentValue={fields[field.name] ?? null} config={field}/>
                          </>
                        ))}
                      </>
                    ))}
                  </div>
                </form>

                <button onClick={saveEntity} disabled={!Object.values(fieldStates).every(Boolean)}>Save</button>
              </>
            ) : (<span>Loading</span>)}
          </main>


      </>
  );
}
