import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api } from "../services/api";
import Modal from "../components/modal";
import { useParams } from "react-router-dom";
import StepConfig from "../components/step_config";
import Breadcrumbs from "../components/breadcrumbs";
import { useToasts } from "../services/ToastService";

export default function ReleaseChannel() {
  const { id } = useParams<{ id: string }>();
  const [releaseChannel, setReleaseChannel] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [releaseChannelName, setReleaseChannelName] = useState<string>("");
  const [steps, setSteps] = useState<any[]>([]);
  const { addToast } = useToasts();

  useEffect(() => {
    loadReleaseChannelData();
  }, [id]);

  const loadStepData = () => {
    api.collection("release_steps").getFullList({
      filter: `release_channel = "${releaseChannel.id}"`,
      sort: "order"
    })
      .then(setSteps)
      .catch((err) => setError(err.message));;
  };

  useEffect(() => {
    setReleaseChannelName(releaseChannel.name);
    loadStepData();
  },[releaseChannel])

  const loadReleaseChannelData = async () => {
    api.collection("release_channels").getOne(id!).then(setReleaseChannel)
      .catch((err) => setError(err.message));
  };

  const saveReleaseChannel = async () => {
    await api.collection("release_channels").update(releaseChannel.id, {
      name: releaseChannelName,
    });
    addToast({ message: "Channel updated", type: "success" });
    loadReleaseChannelData();
  };

  const createStep = async () => {

    await api.collection("release_steps").create({
      name: "New step",
      release_channel: releaseChannel.id,
      order: steps.length + 1,
      config: {
        content: ""
      },
      type: "template",
    });
    addToast({ message: "Step created", type: "success" });
    loadStepData();
  };


  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/release-channels", name: "Release Channels"},
              {name: releaseChannel.name},
            ]}/>
            <h1>{releaseChannel.name}</h1>
            
            <details>
              <summary>Config</summary>
              <label>Name</label>
              <input type="text" value={releaseChannelName} onChange={(e) => setReleaseChannelName(e.target.value)}/>
              <button onClick={saveReleaseChannel}>Save</button>
            </details>

            
            <button onClick={() => createStep()}>Add Step</button>
            
            <div>
              {steps.map((step:any) => (
                <>
                  <StepConfig fullReload={loadStepData} step={step}/>
                </>
              ))}
            </div>
          </main>
      </>
  );
}
