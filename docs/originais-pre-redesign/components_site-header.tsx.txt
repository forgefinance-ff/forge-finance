"use client";

import {
  Bell,
  Search,
  Settings,
  UserCircle2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#09090B]/90 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <SidebarTrigger />

        <Separator
          orientation="vertical"
          className="h-6 bg-white/10"
        />

        <div>
          <h1 className="text-xl font-bold text-white">
            Dashboard
          </h1>

          <p className="text-xs text-slate-400">
            Bem-vindo ao Forge Finance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

          <Input
            placeholder="Pesquisar..."
            className="w-72 rounded-xl border-white/10 bg-[#111827] pl-10 text-white placeholder:text-slate-500"
          />
        </div>

        <button className="rounded-xl bg-[#111827] p-2 transition hover:bg-[#171F30]">
          <Bell className="h-5 w-5 text-slate-300" />
        </button>

        <button className="rounded-xl bg-[#111827] p-2 transition hover:bg-[#171F30]">
          <Settings className="h-5 w-5 text-slate-300" />
        </button>

        <button className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 p-2">
          <UserCircle2 className="h-6 w-6 text-white" />
        </button>
      </div>
    </header>
  );
}