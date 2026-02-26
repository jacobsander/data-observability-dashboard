import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <RouterProvider
      router={router}
      fallbackElement={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    />
  );
}