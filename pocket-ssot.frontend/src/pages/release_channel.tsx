import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { useParams } from "react-router-dom";
import StepConfig from "../components/step_config";
import Breadcrumbs from "../components/breadcrumbs";
import { useToasts } from "../services/ToastService";

export default function ReleaseChannel() {
  const { id } = useParams<{ id: string }>();
  const [releaseChannel, setReleaseChannel] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [releaseChannelName, setReleaseChannelName] = useState<string>("");
  const [steps, setSteps] = useState<any[]>([]);
  const { addToast } = useToasts();

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if(releaseChannel){
      setReleaseChannelName(releaseChannel.name);
      setSteps(releaseChannel.steps);
    }
  },[releaseChannel])

  const loadData = async () => {
    const data = await apiFetch<any>(`/api/release-channels/${id}`, {method: "GET"});
    setReleaseChannel(data);
  };

  const saveReleaseChannel = async () => {
    const data = await apiFetch<any>(`/api/release-channels/${id}`, {
      method: "POST",
      body: JSON.stringify({
        name: releaseChannelName,
        steps: steps
      })
    });
    if(data.ok){
      addToast({ message: "Channel updated", type: "success" });
      loadData();
    } else {
      addToast({ message: "Channel updating failed", type: "error" });
    }
  };

  const createStep = async () => {
    setSteps([...steps,
      {
        name: "New step",
        order: steps.length + 1,
        config: {
          content: ""
        },
        type: "template",
      }
    ]);
  };

  const updateStep = async (index:number, data:any) => {
    setSteps([...steps.filter((a,b) => b != index), data]);
  }

  const deleteStep = async (index:number) => {
    setSteps([...steps.filter((a,b) => b != index)]);
  }


  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/release-channels", name: "Release Channels"},
              {name: releaseChannel?.name},
            ]}/>
            <h1>{releaseChannel?.name}</h1>

            <label>Name</label>
            <input type="text" value={releaseChannelName} onChange={(e) => setReleaseChannelName(e.target.value)}/>
                        
            <button onClick={() => createStep()}>Add Step</button>
            
            <div>
              {steps.map((step:any, index:number) => (
                <>
                  <StepConfig deleteEmit={() => deleteStep(index)} saveEmit={(a) => updateStep(index, a)} step={step}/>
                </>
              ))}
            </div>

            <button onClick={saveReleaseChannel}>Save</button>
          </main>
      </>
  );
}
