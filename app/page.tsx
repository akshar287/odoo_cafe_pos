import Link from "next/link";
import { Coffee, Settings, ChefHat, ArrowRight } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/20 blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl">
            <Coffee className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Odoo Cafe</span>
        </div>
        <div>
          {user ? (
            <Link
              href="/pos"
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all font-medium text-sm flex items-center gap-2 backdrop-blur-md"
            >
              Go to POS <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 transition-all font-medium text-sm shadow-[0_0_20px_rgba(249,115,22,0.3)]"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 mt-[-4rem]">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          Next-Gen Point of Sale
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/30">
          Run your cafe,<br />beautifully.
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mb-12 font-light">
          A premium, real-time point of sale system designed for modern restaurants and cafes. Fast, reliable, and stunningly gorgeous.
        </p>

        {/* Portals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mx-auto px-4">
          
          <Link href="/pos" className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 mb-6 group-hover:scale-110 transition-transform">
                <Coffee className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">POS Terminal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">Lightning-fast order entry, beautiful category layouts, and seamless payment processing.</p>
            </div>
          </Link>

          <Link href="/kds" className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <ChefHat className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Kitchen Display</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">Real-time order synchronization for your kitchen staff. No more lost paper tickets.</p>
            </div>
          </Link>

          <Link href="/backend" className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-start text-left">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Management</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">Comprehensive backend to manage products, categories, employees, and view reports.</p>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-zinc-500 text-sm border-t border-white/10">
        <p>© 2026 Odoo Cafe Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
