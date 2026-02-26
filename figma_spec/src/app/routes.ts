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
]);
