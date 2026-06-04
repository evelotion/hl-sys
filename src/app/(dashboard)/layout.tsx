// hl-sys/src/app/(dashboard)/layout.tsx
import React from 'react';
import { LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('user_session')?.value;

  if (!sessionStr) redirect('/login');

  const user = JSON.parse(sessionStr);

  let initials = 'US';
  if (user.name) {
    if (user.name.includes('Indra')) {
      initials = 'IND';
    } else {
      initials = user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar Light Premium */}
      <aside className="w-64 bg-white border-r border-slate-200/60 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <span className="text-white font-black text-sm">HL</span>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">HL-SYS</h1>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-11">Deprtement Logistic</p>
        </div>
        
        {/* VVV Komponen Navigasi Dinamis dipasang di sini VVV */}
        <SidebarNav />

        {/* Profile Card Light */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 group/profile justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm">
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
              <button type="submit" className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/profile:opacity-100 p-1" title="Logout">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="p-8 lg:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}