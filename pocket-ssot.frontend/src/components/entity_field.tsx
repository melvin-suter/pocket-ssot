import { useEffect, useState } from "react";

export default function EntityField({currentValue, config, emit}:{currentValue:any, config:any, emit:(name:string, value:any, state: boolean) => void}) {
    const [value,setValue] = useState(currentValue);
    const [error,setError] = useState<string>("");
    const [listNew, setListNew] = useState<any>("");

    useEffect(() => {
        setValue(currentValue);

        if(config.type == "switch" && (currentValue == undefined || String(currentValue).length == 0))  {
            setValue(Boolean(config.config.defaultState));
        }
    },[currentValue]);

    useEffect(() => {
        let state = true;
        let error = "";

        switch(config.type) {
            case "list-string":
                // If regex is set in config and is not match, set state to false
                if( (config.config.regex ?? "").length > 0) {
                    let regex = new RegExp(config.config.regex);
                    if(!regex.test(listNew)){
                        state = false;
                        error += "Not matching regex " + config.config.regex;
                    }
                }
                break;
        }

        setError(error);
    },[listNew]);

    useEffect(() => {
        let state = true;
        let error = "";

        switch(config.type) {
            case "string":
                // If regex is set in config and is not match, set state to false
                if( (config.config.regex ?? "").length > 0) {
                    let regex = new RegExp(config.config.regex);
                    if(!regex.test(value)){
                        state = false;
                        error += "Not matching regex " + config.config.regex;
                    }
                }
                break;
        }

        setError(error);

        emit(config.name, value, state);
    },[value]);

    const listAdd = async () => {
        await setValue([...(value ?? []), listNew]);
        setListNew("");
    };

    const listDelete = async (index:number) => {
        setValue(value.filter((_:any, i:any) => i !== index));
    }
    

    return (
        <article className={"entityField " + (config.config.width)}>
            <h3>{config.label}</h3>


            {config.type == "string" ? (
                <>
                    <input disabled={config.config.apiCallbackBlockManual} type="text" className={error != "" ? "text-danger" : ""} defaultValue={currentValue} value={value} onChange={(e) => setValue(e.target.value)}/>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}

            {config.type == "textarea" ? (
                <>
                    <textarea disabled={config.config.apiCallbackBlockManual} className={error != "" ? "text-danger" : ""} defaultValue={currentValue} value={value} onChange={(e) => setValue(e.target.value)}></textarea>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}

            {config.type == "number" ? (
                <>
                    <input disabled={config.config.apiCallbackBlockManual} type="number" className={error != "" ? "text-danger" : ""} defaultValue={currentValue} value={value} onChange={(e) => setValue(Number(e.target.value))}/>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}

            {config.type == "switch" ? (
                <>
                    <input disabled={config.config.apiCallbackBlockManual} type="checkbox" role="switch" checked={value == "true" || value == true} value="on" onChange={(e) => setValue(e.target.checked)}/>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}

            {config.type == "select" ? (
                <>
                    <select disabled={config.config.apiCallbackBlockManual} value={value} onChange={(e) => setValue(e.target.value)}>
                        {(config.config.options ?? []).map((o:string) => (
                            <>
                                {o.split(": ").length > 1 ? (
                                    <option value={o.split(": ")[0]}>{o.split(": ")[1]}</option>
                                ) : (
                                    <option value={o}>{o}</option>
                                )}
                                </>
                            )
                        )}
                    </select>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}

            

            {config.type == "list-string" ? (
                <>
                    <ul>
                        {(value ?? []).map((i:any, index:number) => 
                            <li>
                                {i}
                                <button type="button" className="sm danger" onClick={() => listDelete(index)}>X</button>
                            </li>
                        )}
                    </ul>
                    <input disabled={config.config.apiCallbackBlockManual} type="text" className={error != "" ? "text-danger" : ""} defaultValue={listNew} value={listNew} onChange={(e) => setListNew(e.target.value)}/>
                    <button disabled={error != ""} type="button" className="sm" onClick={listAdd}>+</button>
                    <p className="text-danger">{error}</p>
                </>
            ) : (null)}
        </article>
    )
}