// src/app/(dashboard)/loading.tsx
import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-10 w-full animate-pulse">
      {/* 1. SKELETON GREETING (Header) */}
      <div className="mb-6 md:mb-8 space-y-3">
        <div className="h-8 md:h-10 bg-slate-200 rounded-lg w-3/4 md:w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded-md w-1/2 md:w-1/4"></div>
      </div>

      {/* 2. SKELETON 4 KARTU KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm h-[100px] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-slate-200 rounded-md"></div>
              <div className="h-3 bg-slate-200 rounded-md w-16 md:w-20"></div>
            </div>
            <div className="h-8 bg-slate-200 rounded-lg w-12 md:w-16 mt-3"></div>
          </div>
        ))}
      </div>

      {/* 3. SKELETON TABEL TIKET BERJALAN (Desktop & Mobile) */}
      <div className="w-full">
        <div className="h-4 bg-slate-200 rounded-md w-32 mb-3 md:hidden"></div>
        
        {/* Mobile View Skeleton */}
        <div className="md:hidden flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-[110px]">
              <div className="flex justify-between mb-4">
                <div className="w-20 h-4 bg-slate-200 rounded-md"></div>
                <div className="w-16 h-4 bg-slate-200 rounded-md"></div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-6"></div>
            </div>
          ))}
        </div>

        {/* Desktop View Skeleton */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="p-6">
            <div className="flex justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="w-24 h-3 bg-slate-200 rounded-md"></div>
              <div className="w-24 h-3 bg-slate-200 rounded-md"></div>
              <div className="w-24 h-3 bg-slate-200 rounded-md"></div>
              <div className="w-24 h-3 bg-slate-200 rounded-md"></div>
            </div>
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="w-24 h-4 bg-slate-200 rounded-md"></div>
                  <div className="w-32 h-3 bg-slate-200 rounded-full"></div>
                  <div className="w-32 h-3 bg-slate-200 rounded-full"></div>
                  <div className="w-20 h-5 bg-slate-200 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SKELETON KARTU MEDIUM (SLA Kritis & Tiket Terbaru) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-[220px] flex flex-col">
            <div className="flex justify-between mb-6">
              <div className="w-32 h-4 bg-slate-200 rounded-md"></div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="w-1/4 h-3 bg-slate-200 rounded-md mb-4"></div>
              <div className="w-3/4 h-5 bg-slate-200 rounded-md mb-2"></div>
              <div className="w-1/2 h-5 bg-slate-200 rounded-md mb-6"></div>
              <div className="w-full h-2 bg-slate-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. SKELETON COMPLETION TRACKING */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[300px] flex flex-col justify-center">
        <div className="w-40 h-4 bg-slate-200 rounded-md mb-8"></div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <div className="w-32 h-32 bg-slate-200 rounded-full shrink-0"></div>
          <div className="space-y-4 w-full sm:w-auto">
            <div className="w-32 h-4 bg-slate-200 rounded-md"></div>
            <div className="w-40 h-4 bg-slate-200 rounded-md"></div>
            <div className="w-36 h-4 bg-slate-200 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}