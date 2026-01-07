import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useEffect, useState } from "react";
import Modal from "./modal";
import { useToasts } from "../services/ToastService";

export default function Navbar() {
    const [showModal, setShowModal] = useState(false);
    const [emailChanged, setEmailChanged] = useState(false);
    const [user, setUser] = useState<any>({});
    const { addToast } = useToasts();

    const logout = () => {
        api.authStore.clear();
        window.location.reload();
    };

    useEffect(() => {
        loadUser();
    },[]);

    const loadUser = () => {
        api.collection("users").getOne(api.authStore.model!.id).then(setUser);
        setEmailChanged(false);
    }

    const changePassword = async () => {
        if(user.oldPassword.length > 0 && user.password.length > 0 && user.password == user.passwordConfirm) {
            await api.collection("users").update(api.authStore.model!.id,{
                oldPassword: user.oldPassword,
                password: user.password,
                passwordConfirm: user.passwordConfirm
            });
            await api.collection("users").authWithPassword(user.email, user.password);
            addToast({ message: "Password changed", type: "success" });
        }

        loadUser();
        setShowModal(false);
    }

    const changeUsername = async () => {
        if(emailChanged){
            await fetch("/api/change-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${api.authStore.token}`,
                },
                body: JSON.stringify({ email: user.username + "@localhost.local" }),
            });

            addToast({ message: "Username changed", type: "success" });
            setTimeout(logout, 3000);
        }

        loadUser();
        setShowModal(false);
    };

    return (
        <>
            <nav>
                <ul>
                    <li><Link to="/">Collections</Link></li>
                    <li><Link to="/policies">Policies</Link></li>
                    <li><Link to="/release-channels">Release Channels</Link></li>
                    <li><a onClick={() => setShowModal(true)}>User Settings</a></li>
                    <li><a onClick={logout}>Logout</a></li>
                </ul>
            </nav>

            {showModal ? (
                <Modal header="Change User">
                    <label>Email</label>
                    <input type="text" defaultValue={user.email.split("@")[0]} value={user.username} onChange={(e:any) => {
                        setUser({...user, ...{username: e.target.value}});
                        setEmailChanged(true);
                    }}/>
                    <p>
                        <button onClick={() => changeUsername()}>Change Username</button>
                    </p>
                    <label>Password</label>
                    <input type="password" placeholder="Old Password" value={user.oldPassword} onChange={(e:any) => setUser({...user, ...{oldPassword: e.target.value}})}/>
                    <input type="password" placeholder="Password" value={user.password} onChange={(e:any) => setUser({...user, ...{password: e.target.value}})}/>
                    <input type="password" placeholder="Confirm" value={user.passwordConfirm} onChange={(e:any) => setUser({...user, ...{passwordConfirm: e.target.value}})}/>
                    <button onClick={() => changePassword()}>Change Password</button>
                    <p>
                        <button onClick={() => setShowModal(false)}>Close</button>
                    </p>
                </Modal>
            ) : (null)}
        </>
    )
}