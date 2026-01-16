import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link } from "react-router-dom";
import { useToasts } from "../services/ToastService";

export default function Policies() {
  const [deleteID, setDeleteID] = useState<string|undefined>(undefined);
  const [newPolicy, setNewPolicy] = useState<string>("");
  const [policies, setPolicies] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToasts();

    
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await apiFetch<any>("/api/policies", {method: "GET"});
    setPolicies(data);
  };

  const addPolicy = async () => {
    const res = await apiFetch<any>("/api/policies", {
      method: "PUT",
      body: JSON.stringify({
        name: newPolicy,
        allow_extra_fields: true
      })
    });
    if(res.ok == true) {
      addToast({ message: "Policy created", type: "success" });
      setNewPolicy("");
      loadData();
    } else {
      addToast({ message: "Policy creation failed", type: "error" });
    }
  };

  const deletePolicy = async (id:any) => {
    const res = await apiFetch<any>(`/api/policies/${id}`, {
      method: "DELETE"
    });
    if(res.ok == true) {
      addToast({ message: "Policy deleted", type: "success" });
      setDeleteID(undefined);
      loadData();
    } else {
      addToast({ message: "Policy deletion failed", type: "error" });
    }
  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <h1>Policies</h1>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="compact"></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr>
                    <td>
                      <Link to={"/policies/" + policy.id}>{policy.name}</Link></td>
                    <td>
                      <button onClick={() => setDeleteID(policy.id)} className="danger">Delete</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <input type="text" value={newPolicy} placeholder="New Policy" onChange={(e) => setNewPolicy(e.target.value)}/>
                  </td>
                  <td>
                    <button onClick={addPolicy}>Create</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </main>

          
          {deleteID !== undefined ? (
            <Modal header="Delete?">
              <p>Delete this policy?</p>
              <button onClick={() => deletePolicy(deleteID)} className="danger" style={{marginRight: "1rem"}}>Yes</button>
              <button onClick={() => setDeleteID(undefined)}>No</button>
            </Modal>
          ) : (null)}
      </>
  );
}
