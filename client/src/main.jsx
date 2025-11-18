import React from "react";
import { createRoot } from "react-dom/client";
import CVOptimizer from "./CVOptimizer";
import "./styles.css";

function App() {
  return <CVOptimizer />;
}

createRoot(document.getElementById("root")).render(<App />);
