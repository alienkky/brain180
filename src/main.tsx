import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { V2Shell } from "./v2-shell/V2Shell"
import { V3Shell } from "./v3/V3Shell"

// Routing:
//   ?v3=1  → Brain180 v3 (3-part protocol, customer + admin modes)
//   ?v1=1  → v1 prototype (static text library)
//   default → v2 shell
const params = new URLSearchParams(window.location.search)
const useV1 = params.has("v1")
const useV3 = params.has("v3")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {useV3 ? <V3Shell /> : useV1 ? <App /> : <V2Shell />}
  </StrictMode>
)
