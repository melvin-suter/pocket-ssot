import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api } from "../services/api";
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
  
  useEffect(() => {
    loadGroupData();
    loadData();
  }, [id]);

  const loadData = async () => {
    api.collection("policies")
      .getFullList({ sort: "name" })
      .then(setPolicies)
      .catch((err) => setError(err.message));
    api.collection("release_channels")
      .getFullList({ sort: "name" })
      .then(setReleaseChannels)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    setGroupName(group.name);
    setReleaseChannel(group.release_channel);
    setReleaseChannelEntity(group.release_channel_entity);
    setAllowExtraFields(group.allow_extra_fields);
    setAllowHostRelease(group.allow_host_release);
    
    api.collection("entities").getFullList({
      filter: `group = "${group.id}"`,
      sort: "name",
    }).then(setEntities).catch((err) => setError(err.message));

  },[group])

  const loadGroupData = async () => {
    api.collection("groups").getOne(id!, {
      expand: "policies"
    }).then(setGroup)
      .catch((err) => setError(err.message));
  };

  const saveGroup = async () => {
    await api.collection("groups").update(group.id, {
      name: groupName,
      allow_extra_fields: allowExtraFields,
      release_channel: releaseChannel,
      release_channel_entity: releaseChannelEntity,
      allow_host_release: allowHostRelease
    });
    addToast({ message: "Collection updated", type: "success" });
    loadGroupData();
  };

  const attachPolicy = async (id:string) => {
    if(id != ""){
      await api.collection("groups").update(group.id, {
        policies: [...group.policies, id]
      });
    addToast({ message: "Policy added", type: "success" });
      loadGroupData();
    }
  }

  const detachPolicy = async (id:string) => {
    if(id != ""){
      await api.collection("groups").update(group.id, {
        policies: [...group.policies.filter((i:string) => i != id)]
      });
    addToast({ message: "Policy removed", type: "success" });
      loadGroupData();
    }
  }

  const addEntity = async () => {
    await api.collection("entities").create({
      name: newEntity,
      group: group.id
    });
    addToast({ message: "Entity created", type: "success" });
    setNewEntity("");
    loadGroupData();
  }

  const deleteEntity = async (id:any) => {
    await api.collection("entities").delete(id);
    addToast({ message: "Entity deleted", type: "success" });
    setDeleteID(undefined);
    loadGroupData();
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


              <label>Allow Host Release</label>
              <p>
                <input type="checkbox" role="switch" value="Allow" checked={allowHostRelease} onChange={(e) => setAllowHostRelease(e.target.checked)}/>
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
              <button onClick={saveGroup}>Save</button>
            </details>

            <details>
              <summary role="button">Policies</summary>
              <ul>
                {(group.expand?.policies ?? []).map((policy:any) => (
                  <li>
                    {policy.name}
                    <button className="danger sm" style={{marginLeft: "0.5rem"}} onClick={() => detachPolicy(policy.id)}>X</button>
                  </li>
                ))}
              </ul>
              <select value="" onChange={(e) => attachPolicy(e.target.value)}>
                <option selected value=""></option>
                {policies?.map((policy) => (
                  <option value={policy.id}>{policy.name}</option>
                ))}
              </select>
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
