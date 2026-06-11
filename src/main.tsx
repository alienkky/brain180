import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { V2Shell } from "./v2-shell/V2Shell"
import { V3Shell } from "./v3/V3Shell"

// Routing:
//   default → Brain180 v3 (3-part protocol, customer + admin modes)
//   ?v2=1  → v2 shell (구 제품)
//   ?v1=1  → v1 prototype (static text library)
const params = new URLSearchParams(window.location.search)
const useV1 = params.has("v1")
const useV2 = params.has("v2")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {useV1 ? <App /> : useV2 ? <V2Shell /> : <V3Shell />}
  </StrictMode>
)
