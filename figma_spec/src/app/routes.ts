import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { EventDetail } from "./pages/EventDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/event/:eventName",
    Component: EventDetail,
  },
]);
