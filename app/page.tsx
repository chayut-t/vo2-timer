import Timer from './components/Timer';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="pt-8 pb-4 text-center">
        <h1 className="text-2xl font-bold text-white">VO₂max 4x4</h1>
        <p className="text-sm text-zinc-500 mt-1">43-minute interval workout</p>
      </header>

      {/* Main Timer */}
      <main className="flex-1">
        <Timer />
      </main>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <p className="text-xs text-zinc-600">
          Tap Start when ready
        </p>
      </footer>
    </div>
  );
}
