import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <RouterProvider
      router={router}
      fallbackElement={
        <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <p className="text-foreground/70">Loading...</p>
        </div>
      }
    />
  );
}