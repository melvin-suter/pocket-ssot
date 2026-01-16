import { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import { api, apiFetch } from "../services/api";
import Modal from "../components/modal";
import { Link, useParams } from "react-router-dom";
import Breadcrumbs from "../components/breadcrumbs";

export default function GroupReleases() {
  const { id } = useParams<{ id: string }>();
  const [releases, setReleases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
      const data = await apiFetch<any>(`/api/collections/${id}/releases`, {method: "GET"});
      setReleases(data.sort(
        (a:any, b:any) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
      ));
      const dataGroup = await apiFetch<any>(`/api/collections/${id}`, {method: "GET"});
      setGroup(dataGroup);

  };

  return (
      <>
          <Navbar/>
          <main className="container">
            <Breadcrumbs crumbs={[
              {to: "/", name: "Groups"},
              {to: "/collections/" + id, name: group.name},
              {name: "Releases"},
            ]}/>

            <h1>Releases</h1>

            {releases.map((release:any) => (
              <details style={{alignItems: "stretch"}}>
                <summary className={(release.status ? "success": "error") + ((release.results ?? []).length == 0 ? " running" : "")}>{release.name}</summary>
                {release.results?.map((output:any) => 
                  <article>
                    <strong>{output.name}</strong>
                    {output.status ? (
                      <p className="text-success">OK</p>
                    ) : (
                      <>
                        <p className="text-danger">FAILED</p>
                        <p>{output.error}</p>
                      </>
                    )}

                    <code><pre>{JSON.stringify(output.meta,null,2)}</pre></code>
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
