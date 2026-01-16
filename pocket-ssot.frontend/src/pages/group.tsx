import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link, useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";
import { useToasts } from "../services/ToastService";

export default function Group() {
  const { addToast } = useToasts();

  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [releaseChannel, setReleaseChannel] = useState<string>("");
  const [releaseChannelEntity, setReleaseChannelEntity] = useState<string>("");
  const [allowExtraFields, setAllowExtraFields] = useState<boolean>(false);
  const [allowHostRelease, setAllowHostRelease] = useState<boolean>(false);
  const [policies, setPolicies] = useState<any[]>([]);
  const [releaseChannels, setReleaseChannels] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [newEntity, setNewEntity] = useState<string>("");
  const [deleteID, setDeleteID] = useState<string|undefined>(undefined);
  const [entitySearch, setEntitySearch] = useState<string>("");
  const [newPolicies, setNewPolicies] = useState<string[]>([]);
  
  useEffect(() => {
    loadCollection();
    loadData();
  }, [id]);

  const loadData = async () => {
    const dataPolicies = await apiFetch<any>(`/api/policies`, {method: "GET"});
    setPolicies(dataPolicies);

    const dataChannels = await apiFetch<any>(`/api/release-channels`, {method: "GET"});
    setReleaseChannels(dataChannels);
  };

  useEffect(() => {
    setGroupName(group.name);
    setReleaseChannel(group.releaseChannelCollection);
    setReleaseChannelEntity(group.releaseChannelEntity);
    setAllowExtraFields(group.allowExtraFields);
    setNewPolicies(group.policies);
    
    loadEntities();

  },[group])

  const loadEntities = async () => {
    const data = await apiFetch<any>(`/api/collections/${id}/entities`, {method: "GET"});
    setEntities(data.sort((a:any, b:any) => a.name.localeCompare(b.name)));
  };

  const loadCollection = async () => {
    const data = await apiFetch<any>(`/api/collections/${id}`, {method: "GET"});
    setGroup(data);
  };

  const saveGroup = async () => {

    const data = await apiFetch<any>(`/api/collections/${id}`, {
      method: "POST",
      body: JSON.stringify({
        name: groupName,
        allowExtraFields: allowExtraFields,
        releaseChannelCollection: releaseChannel,
        releaseChannelEntity: releaseChannelEntity,
        policies: newPolicies
      })
    });
    if(data.ok){
      addToast({ message: "Collection updated", type: "success" });
      loadData();
    } else {
      addToast({ message: "Collection updating failed", type: "error" });
    }

    loadCollection();
  };

  const attachPolicy = async (id:string) => {
    if(id != ""){
      setNewPolicies([...newPolicies, id]);
    }
  }

  const detachPolicy = async (id:string) => {
    if(id != ""){
      setNewPolicies(newPolicies.filter((a:any) => a != id));
    }
  }

  const addEntity = async () => {
    const res = await apiFetch<any>(`/api/entities`, {
      method: "PUT",
      body: JSON.stringify({
        name: newEntity,
        collectionId: group.id
      })
    });
    if(res.ok == true) {
      addToast({ message: "Entity created", type: "success" });
      setNewEntity("");
    loadCollection();
    } else {
      addToast({ message: "Entity creation failed", type: "error" });
    }
  }

  const deleteEntity = async (entityId:any) => {
    const res = await apiFetch<any>(`/api/collections/${id}/entities/${entityId}`, {
      method: "DELETE"
    });
    if(res.ok == true) {
      addToast({ message: "Entity deleted", type: "success" });
      setDeleteID(undefined);
      loadCollection();
    } else {
      addToast({ message: "Entity deletion failed", type: "error" });
    }
  };

  const startRelease = async () => {
    const res = await fetch(`/api/release/${group.id}`, {
      method: "POST",
      headers: {
        Authorization: api.authStore.token,
      },
    });

    if (!res.ok) {
      addToast({ message: await res.text(), type: "error" });
      throw new Error(await res.text());
    }
    else {
      addToast({ message: "Release started", type: "success" });
    }
  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/", name: "Collections"},
              {name: group.name},
            ]}/>
            
            <h1>{group.name}</h1>
            
            <details>
              <summary role="button">Config</summary>

              <label>Name</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}/>
              
              <label>Allow Extra Fields</label>
              <p>
                <input type="checkbox" role="switch" value="Allow" checked={allowExtraFields} onChange={(e) => setAllowExtraFields(e.target.checked)}/>
              </p>

             
              <label>Release Channel</label>
              <select value={releaseChannel} onChange={(e) => setReleaseChannel(e.target.value)}>
                <option value=""></option>
                {releaseChannels.map((channel:any) =>
                  <option value={channel.id}>{channel.name}</option>
                )}
              </select>
              
              <label>Release Channel for Entities</label>
              <select value={releaseChannelEntity} onChange={(e) => setReleaseChannelEntity(e.target.value)}>
                <option value=""></option>
                {releaseChannels.map((channel:any) =>
                  <option value={channel.id}>{channel.name}</option>
                )}
              </select>
              
              <label>Policies</label>
              <ul>
                {(newPolicies ?? []).map((policyId:any) => (
                  <li>
                    {policies.find((i) => i.id == policyId)?.name}
                    <button className="danger sm" style={{marginLeft: "0.5rem"}} onClick={() => detachPolicy(policyId)}>X</button>
                  </li>
                ))}
              </ul>
              <select value="" onChange={(e) => attachPolicy(e.target.value)}>
                <option selected value=""></option>
                {policies?.filter((policy) => (newPolicies ?? []).indexOf(policy.id) < 0).map((policy) => (
                  <option value={policy.id}>{policy.name}</option>
                ))}
              </select>
              
              <button onClick={saveGroup}>Save</button>
            </details>


            <button onClick={startRelease}>Release</button>
            <Link to={"/collections/" + id + "/releases"}>Show Releases</Link>
              
            <h3>Entities</h3>
            <input type="search" placeholder="Search..." value={entitySearch} onChange={(e:any) => setEntitySearch(e.target.value)}/>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="compact"></th>
                </tr>
              </thead>
              <tbody>
                {entities.filter((entity:any) => entity.name.match(entitySearch)).map((entity:any) => (
                  <tr>
                    <td><Link to={"/entities/" + entity.id}>{entity.name}</Link></td>
                    <td>
                      <button onClick={() => setDeleteID(entity.id)} className="danger">Delete</button>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td>
                    <input type="text" value={newEntity} placeholder="New Entity" onChange={(e) => setNewEntity(e.target.value)}/>
                  </td>
                  <td>
                    <button onClick={addEntity}>Create</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </main>


          {deleteID !== undefined ? (
            <Modal header="Delete?">
              <p>Delete this entity?</p>
              <button onClick={() => deleteEntity(deleteID)} className="danger" style={{marginRight: "1rem"}}>Yes</button>
              <button onClick={() => setDeleteID(undefined)}>No</button>
            </Modal>
          ) : (null)}
      </>
  );
}
