import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "./modal";

export default function StepConfig({step,deleteEmit, saveEmit}:{step:any, deleteEmit: () => void, saveEmit: (data:any) => void}) {
    const [name,setName] = useState("");
    const [type,setType] = useState("");
    const [order,setOrder] = useState(0);
    const [config,setConfig] = useState<any>({});
    const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
    
    useEffect(() => {
        setName(step.name);
        setType(step.type);
        setOrder(step.order);
        setConfig(step.config);
    },[step]);
        
    useEffect(() => {
        const timeout = setTimeout(() => {
            saveEmit({
                name,
                type,
                order,
                config
            });
        }, 200);

        return () => clearTimeout(timeout);
    }, [name, type, order, config]);

    const deleteStep = async () => {
        setDeleteOpen(false);
        deleteEmit();
    };
   

    return (
        <>
            <details style={{alignItems: "stretch"}}>
                <summary>{name}</summary>
                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}/>
                
                <label>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="template">Template</option>
                    <option value="shell">Shell</option>
                </select>

                <div>
                    <label>Foreach Entity</label>
                    <input type="checkbox" role="switch" value="yes" checked={config.eachEntity} onChange={(e) => setConfig({...config, ...{eachEntity: e.target.checked}})}/>
                </div>

                <label>Order</label>
                <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))}/>

                {type == "template" ? (
                    <>
                        <label>Path</label>
                        <input type="text" value={config.path ?? ""} onChange={(e) => setConfig({...config, ...{path: e.target.value}})}/>

                        <label>Template</label>
                        <textarea rows={12} value={config.template ?? ""} onChange={(e) => setConfig({...config, ...{template: e.target.value}})}></textarea>
                    </>
                ) :(null)}

                {type == "shell" ? (
                    <>
                        <label>Shell Command</label>
                        <textarea rows={12} value={config.shell ?? ""} onChange={(e) => setConfig({...config, ...{shell: e.target.value}})}></textarea>
                    </>
                ) :(null)}

                <button className="danger float-end" onClick={() => setDeleteOpen(true)}>Delete</button>
            </details>

            {deleteOpen ? (
                <Modal header="Delete">
                    <p>Delete step "{step.name}"?</p>

                    <button className="danger" onClick={deleteStep}>Delete</button>
                    <button  onClick={() => setDeleteOpen(false)}>No</button>
                </Modal>
            ) : (null)}
        </>
    )
}