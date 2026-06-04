import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Ticket, LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;

  // Proteksi Rute
  if (!sessionStr) {
    redirect('/login');
  }

  const user = JSON.parse(sessionStr);

  // Penyesuaian inisial dinamis
  let initials = 'US';
  if (user.name) {
    if (user.name.includes('Indra')) {
      initials = 'IND';
    } else {
      initials = user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    }
  }

  return (
    <div className="flex h-screen bg-[#F4F7FB] text-slate-800 overflow-hidden relative selection:bg-blue-200 selection:text-blue-900">
      <aside className="w-64 bg-white/60 backdrop-blur-2xl border-r border-white/80 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-sm">HL</span>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">HL-SYS</h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-11">Logistik & Asset</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          <Link href="/" className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-sm border border-slate-100 text-blue-600 font-bold transition-all group overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l-xl"></div>
            <LayoutDashboard size={18} className="text-blue-600" />
            <span className="relative z-10">Dashboard</span>
          </Link>
          
          <Link href="/tickets" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 font-semibold transition-all hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 group">
            <Ticket size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            Semua Tiket
          </Link>
        </nav>

        {/* Profil Dinamis & Logout (Hover to reveal) */}
        <div className="p-5 border-t border-slate-200/50 bg-white/30 backdrop-blur-md flex items-center justify-between group">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 shrink-0 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          
          <form action={async () => {
            'use server';
            (await cookies()).delete('user_session');
            redirect('/login');
          }}>
            <button type="submit" className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1" title="Logout">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-8 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}