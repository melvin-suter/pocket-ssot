import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Groups from "./pages/groups";
import { RequireAuth } from "./services/auth-router";
import Login from "./pages/login";

import './App.css'
import Group from "./pages/group";
import Policies from "./pages/policies";
import Policy from "./pages/policy";
import Entity from "./pages/entity";
import ReleaseChannels from "./pages/release_channels";
import ReleaseChannel from "./pages/release_channel";
import GroupReleases from "./pages/group_releases";
import EntityReleases from "./pages/entity_releases";
import { ToastProvider, useToasts } from "./services/ToastService";
import ToastContainer from "./components/toast-container";

function App() {
  return (
    <>
      <ToastProvider>
        <ToastContainer/>

        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/" element={<RequireAuth><Groups /></RequireAuth>} />
          <Route path="/collections/:id" element={<RequireAuth><Group /></RequireAuth>} />
          <Route path="/collections/:id/releases" element={<RequireAuth><GroupReleases /></RequireAuth>} />
          <Route path="/policies" element={<RequireAuth><Policies /></RequireAuth>} />
          <Route path="/policies/:id" element={<RequireAuth><Policy /></RequireAuth>} />
          <Route path="/entities/:id" element={<RequireAuth><Entity /></RequireAuth>} />
          <Route path="/entities/:id/releases" element={<RequireAuth><EntityReleases /></RequireAuth>} />
          <Route path="/release-channels" element={<RequireAuth><ReleaseChannels /></RequireAuth>} />
          <Route path="/release-channels/:id" element={<RequireAuth><ReleaseChannel /></RequireAuth>} />
        </Routes>

        <small className="verison">{import.meta.env.VITE_VERSION ?? "dev 1.0.0" }</small>
      </ToastProvider>
    </>
  );
}

export default App;
