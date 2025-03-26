import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Client from "./page/Client";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>OPA</div>} />
        <Route path="/client/:roomId" element={<Client />} />
      </Routes>
    </Router>
  );
}

export default App;
