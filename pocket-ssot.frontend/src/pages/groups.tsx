import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link } from "react-router-dom";
import { useToasts } from "../services/ToastService";

export default function Groups() {
  const { addToast } = useToasts();

  const [deleteID, setDeleteID] = useState<string|undefined>(undefined);
  const [newGroup, setNewGroup] = useState<string>("");
  const [groups, setGroups] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

    
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await apiFetch<any>("/api/collections", {method: "GET"});
    setGroups(data.sort((a:any, b:any) => a.name.localeCompare(b.name)));
  };

  const addGroup = async () => {
    const res = await apiFetch<any>("/api/collections", {
      method: "PUT",
      body: JSON.stringify({
        name: newGroup,
        allow_extra_fields: true
      })
    });
    if(res.ok == true) {
      addToast({ message: "Collection created", type: "success" });
      setNewGroup("");
      loadData();
    } else {
      addToast({ message: "Collection creation failed", type: "error" });
    }
  };

  const deleteGroup = async (id:any) => {
        const res = await apiFetch<any>(`/api/collections/${id}`, {
      method: "DELETE"
    });
    if(res.ok == true) {
      addToast({ message: "Collection deleted", type: "success" });
      setDeleteID(undefined);
      loadData();
    } else {
      addToast({ message: "Collection deletion failed", type: "error" });
    }
  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <h1>Collections</h1>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="compact"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr>
                    <td>
                      <Link to={"/collections/" + group.id}>{group.name}</Link></td>
                    <td>
                      <button onClick={() => setDeleteID(group.id)} className="danger">Delete</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <input type="text" value={newGroup} placeholder="New Collection" onChange={(e) => setNewGroup(e.target.value)}/>
                  </td>
                  <td>
                    <button onClick={addGroup}>Create</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </main>

          
          {deleteID !== undefined ? (
            <Modal header="Delete?">
              <p>Delete this collection?</p>
              <button onClick={() => deleteGroup(deleteID)} className="danger" style={{marginRight: "1rem"}}>Yes</button>
              <button onClick={() => setDeleteID(undefined)}>No</button>
            </Modal>
          ) : (null)}
      </>
  );
}
