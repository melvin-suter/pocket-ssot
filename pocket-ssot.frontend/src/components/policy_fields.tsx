import { useEffect, useState } from "react"

export default function PolicyField({config, emit, deleteEmit}:{config:any, emit:(config:any) => void, deleteEmit: () => void}) {
    const [name,setName] = useState(config.name);
    const [label,setLabel] = useState(config.label);
    const [type,setType] = useState(config.type);
    const [order,setOrder] = useState(config.order);
    const [fieldConfig,setFieldConfig] = useState(config.config ?? {});
    const [newList, setNewList] = useState("");

    useEffect(() => {
        setName(config.name);
        setLabel(config.label);
        setType(config.type);
        setOrder(config.order ?? 0);
        setFieldConfig(config.config ?? {});
    },[config]);

    useEffect(() => {
        emit({
            name: name,
            label: label,
            type: type,
            order: order,
            config: fieldConfig,
        });
    },[name, label, type, fieldConfig]);

    const addOption = async () => {
        setFieldConfig({...fieldConfig,...{options: [...(fieldConfig.options ?? []),newList]}});
        setNewList("");
    }

    const delOption = async (index:number) => {
        setFieldConfig({...fieldConfig,...{options: fieldConfig.options.filter((_i:any, i:number) => i !== index)}});
    }

    return (
        <details style={{alignItems: "stretch"}}>
            <summary>{name}</summary>
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => {setName(e.target.value); }}/>
            <label>Label</label>
            <input type="text" value={label} onChange={(e) => {setLabel(e.target.value); }}/>
            <label>Order</label>
            <input type="number" value={fieldConfig.order} onChange={(e) => {setFieldConfig({...fieldConfig,...{order: e.target.value}})}}/>
            <div>
                <label>Size</label>
                <select value={fieldConfig.width} onChange={(e) => {setFieldConfig({...fieldConfig,...{width: e.target.value}})}}>
                    <option value="default">Default</option>
                    <option value="half-width">Half Width</option>
                    <option value="full-width">Full Width</option>
                </select>
            </div>
            <div>
                <label>Allow API Callback Change</label>
                <input type="checkbox" role="switch" checked={fieldConfig.apiCallback ?? false} value="on" onChange={(e) => {setFieldConfig({...fieldConfig,...{apiCallback: e.target.checked}})}}/>
            </div>
            <div>
                <label>Don't allow manual change</label>
                <input type="checkbox" role="switch" checked={fieldConfig.apiCallbackBlockManual ?? false} value="on" onChange={(e) => {setFieldConfig({...fieldConfig,...{apiCallbackBlockManual: e.target.checked}})}}/>
            </div>
            <label>Type</label>
            <select value={type} onChange={(e) => {setType(e.target.value); }}>
                <option value="string">String</option>
                <option value="textarea">Textarea</option>
                <option value="number">Number</option>
                <option value="switch">Switch</option>
                <option value="select">Select</option>
                <option value="list-string">String List</option>
            </select>

            {type == "string" ? (
                <>
                    <label>Regex Check</label>
                    <input type="text" value={fieldConfig.regex} onChange={(e) => {setFieldConfig({...fieldConfig,...{regex: e.target.value}})}}/>
                </>
            ) : (null)}

            {type == "switch" ? (
                <>
                    <div>
                        <label>Default</label>
                        <input type="checkbox" role="switch" checked={fieldConfig.defaultState} value="on" onChange={(e) => {setFieldConfig({...fieldConfig,...{defaultState: e.target.checked}})}}/>
                    </div>
                </>
            ) : (null)}

            {type == "list-string" ? (
                <>
                    <label>Regex Check</label>
                    <input type="text" value={fieldConfig.regex} onChange={(e) => {setFieldConfig({...fieldConfig,...{regex: e.target.value}})}}/>
                </>
            ) : (null)}

            {type == "select" ? (
                <>
                    <label>Options</label>
                    <ul>
                        {(fieldConfig.options ?? []).map((i:any, index:number) =>
                            <li>
                                {i}
                                <button type="button" className="danger sm" onClick={() => delOption(index)}>X</button>
                            </li>
                        )}
                    </ul>
                    <input type="text" value={newList} onChange={(e) => {setNewList(e.target.value)}}/>
                    <button type="button" onClick={addOption}>+</button>
                </>
            ) : (null)}

            <button type="button" className="danger" onClick={deleteEmit}>Delete</button>
        </details>
    )
}