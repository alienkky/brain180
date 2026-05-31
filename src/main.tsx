import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { V2Shell } from "./v2-shell/V2Shell"

// v2 shell is the new default. The v1 prototype is kept reachable via ?v1=1
// while we migrate features (visualization layer, practice canvas) into v2.
const useV1 = new URLSearchParams(window.location.search).has("v1")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {useV1 ? <App /> : <V2Shell />}
  </StrictMode>
)
