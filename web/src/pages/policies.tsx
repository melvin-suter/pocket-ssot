import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api } from "../services/api";
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
    api.collection("policies")
      .getFullList({ sort: "name" })
      .then(setPolicies)
      .catch((err) => setError(err.message));
  };

  const addPolicy = async () => {
    await api.collection("policies").create({
      name: newPolicy,
      allow_extra_fields: true
    });
    addToast({ message: "Policy created", type: "success" });
    setNewPolicy("");
    loadData();
  };

  const deletePolicy = async (id:any) => {
    await api.collection("policies").delete(id);
    addToast({ message: "Policy deleted", type: "success" });
    setDeleteID(undefined);
    loadData();
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
