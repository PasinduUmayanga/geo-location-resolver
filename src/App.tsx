import LocationInfo from "./components/LocationInfo.tsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        Geo Location Resolver
      </h1>
      <LocationInfo />
    </div>
  );
}
