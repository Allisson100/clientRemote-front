import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Client from "./page/Client";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div
              style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  fontSize: "3rem",
                  color: "#000000",
                  fontWeight: "bold",
                }}
              >
                Aguarde o Host enviar o link ...
              </p>{" "}
            </div>
          }
        />
        <Route path="/client/:urlCode" element={<Client />} />
      </Routes>
    </Router>
  );
}

export default App;
