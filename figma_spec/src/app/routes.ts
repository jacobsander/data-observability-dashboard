import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () =>
      import("./pages/Dashboard").then((m) => ({ Component: m.Dashboard })),
  },
  {
    path: "/event/:eventName",
    lazy: () =>
      import("./pages/EventDetail").then((m) => ({ Component: m.EventDetail })),
  },
  {
    path: "/event/:eventName/param/:paramName",
    lazy: () =>
      import("./pages/ParamDetail").then((m) => ({ Component: m.ParamDetail })),
  },
]);
