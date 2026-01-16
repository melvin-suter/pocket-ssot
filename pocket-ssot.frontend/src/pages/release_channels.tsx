import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link } from "react-router-dom";
import { useToasts } from "../services/ToastService";

export default function ReleaseChannels() {
  const [deleteID, setDeleteID] = useState<string|undefined>(undefined);
  const [newReleaseChannel, setNewReleaseChannel] = useState<string>("");
  const [releaseChannels, setReleaseChannels] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToasts();
    
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await apiFetch<any>("/api/release-channels", {method: "GET"});
    setReleaseChannels(data);
  };

  const addReleaseChannel = async () => {
    const res = await apiFetch<any>("/api/release-channels", {
      method: "PUT",
      body: JSON.stringify({
        name: newReleaseChannel,
        allowExtraFields: true
      })
    });
    if(res.ok == true) {
      addToast({ message: "Channel created", type: "success" });
      setNewReleaseChannel("");
      loadData();
    } else {
      addToast({ message: "Channel creation failed", type: "error" });
    }
  };

  const deleteReleaseChannel = async (id:any) => {
    const res = await apiFetch<any>(`/api/release-channels/${id}`, {
      method: "DELETE"
    });
    if(res.ok == true) {
      addToast({ message: "Channel deleted", type: "success" });
      setDeleteID(undefined);
      loadData();
    } else {
      addToast({ message: "Channel deletion failed", type: "error" });
    }
  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <h1>Release Channels</h1>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="compact"></th>
                </tr>
              </thead>
              <tbody>
                {releaseChannels.map((releaseChannel) => (
                  <tr>
                    <td>
                      <Link to={"/release-channels/" + releaseChannel.id}>{releaseChannel.name}</Link></td>
                    <td>
                      <button onClick={() => setDeleteID(releaseChannel.id)} className="danger">Delete</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <input type="text" value={newReleaseChannel} placeholder="New Release Channel" onChange={(e) => setNewReleaseChannel(e.target.value)}/>
                  </td>
                  <td>
                    <button onClick={addReleaseChannel}>Create</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </main>

          
          {deleteID !== undefined ? (
            <Modal header="Delete?">
              <p>Delete this Release Channel?</p>
              <button onClick={() => deleteReleaseChannel(deleteID)} className="danger" style={{marginRight: "1rem"}}>Yes</button>
              <button onClick={() => setDeleteID(undefined)}>No</button>
            </Modal>
          ) : (null)}
      </>
  );
}
