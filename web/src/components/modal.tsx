export default function Modal(props:{header?:string, children:any}) {
    
    return (<>
        <dialog open={true}>
            <article>
                <header>
                    <p>
                        <strong>{props.header!}</strong>
                    </p>
                </header>
                {props.children}
            </article>
        </dialog>
    </>)
}