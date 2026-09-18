import LocationInfo from "./components/LocationInfo.tsx";

export default function App() {
  return (
    <div
      data-testid="app-shell"
      className="min-h-screen w-full bg-slate-50 flex flex-col items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10"
    >
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        Geo Location Resolver
      </h1>
      <LocationInfo />
    </div>
  );
}
