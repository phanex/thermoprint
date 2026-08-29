import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto-condensed/400.css";
import "@fontsource/roboto-condensed/700.css";
import "@fontsource/roboto-slab/400.css";
import "@fontsource/roboto-slab/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/700.css";
import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/700.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/700.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/merriweather/700.css";
import "@fontsource/caveat/400.css";
import "@fontsource/pacifico/400.css";
import "@fontsource/lobster/400.css";
import "@fontsource/unbounded/400.css";
import "@fontsource/yanone-kaffeesatz/400.css";
import "@fontsource/cuprum/400.css";
import "@fontsource/neucha/400.css";
import "@fontsource/days-one/400.css";
// @ts-expect-error — fontsource variable font CSS import
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { App } from "./App.tsx";
import { useEditorV2Store } from "./store/editor-store.ts";

// Apply saved UI scale before first paint
{
  const scale = useEditorV2Store.getState().uiScale;
  if (scale !== 1) {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
  }
}

// Hydrate editor from saved library on boot
{
  const lib = useEditorV2Store.getState().library;
  const cur =
    lib.labels.find((l) => l.id === lib.currentLabelId) ?? lib.labels[0];
  if (cur) {
    useEditorV2Store.setState({
      currentLabelId: cur.id,
      currentLabelName: cur.name,
      currentLabelDirty: false,
      elements: structuredClone(cur.elements),
      label: { ...cur.label },
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
