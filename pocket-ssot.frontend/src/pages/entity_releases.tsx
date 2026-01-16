import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api } from "../services/api";
import Modal from "../components/modal";
import { Link, useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";

export default function EntityReleases() {
  const { id } = useParams<{ id: string }>();
  const [releases, setReleases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState<any>({});
  const [group, setGroup] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    api.collection("groups").getOne(entity.group).then(setGroup);
  },[entity])

  const loadData = async () => {
    api.collection("releases_entity")
      .getFullList({ filter: `entity = "${id}"`/*, sort: "-created"*/ }) // TODO: fix sort for created, doesnt work right now
      .then(setReleases)
      .catch((err) => setError(err.message));


    api.collection("entities").getOne(id!,).then(setEntity)
      .catch((err) => setError(err.message));

  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/", name: "Groups"},
              {to: "/groups/" + group.id, name: group.name},
              {to: "/entities/" + id, name: entity.name},
              {name: "Releases"},
            ]}/>

            <h1>Releases</h1>

            {releases.map((release:any) => (
              <details style={{alignItems: "stretch"}}>
                <summary className={((release.out ?? []).filter((i:any) => !i.status).length > 0 ? "error": "success") + ((release.out ?? []).length == 0 ? " running" : "")}>{release.name}</summary>
                {release.out?.map((output:any) => 
                  <article>
                    <strong>{output.name ?? ""}</strong>
                    {output.status ? (
                      <p className="text-success">OK</p>
                    ) : (
                      <>
                        <p className="text-danger">FAILED</p>
                        <p>{output.error}</p>
                      </>
                    )}

                    <code><pre>{JSON.stringify(output.meta ?? {},null,2)}</pre></code>
                    {output.meta?.stdout ? (
                      <code><pre>{output.meta.stdout}</pre></code>
                    ) : (null)}

                    
                  </article>
                )}
              </details>
            ))}
          </main>
      </>
  );
}
