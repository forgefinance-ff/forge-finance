"use client";

import * as React from "react";
import Image from "next/image";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  ChartBarIcon,
  CircleHelpIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ListIcon,
  Settings2Icon,
  WalletCardsIcon,
  TargetIcon,
  LandmarkIcon,
} from "lucide-react";

const data = {
  user: {
    name: "Administrador",
    email: "Forge Finance",
    avatar: "/logos/forge-logo.png",
  },

  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Transações",
      url: "/transacoes",
      icon: <ListIcon />,
    },
    {
      title: "Contas",
      url: "/contas",
      icon: <LandmarkIcon />,
    },
    {
      title: "Cartões",
      url: "/cartoes",
      icon: <WalletCardsIcon />,
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: <ChartBarIcon />,
    },
    {
      title: "Metas",
      url: "/metas",
      icon: <TargetIcon />,
    },
    {
      title: "Investimentos",
      url: "/investimentos",
      icon: <FolderIcon />,
    },
  ],

  navSecondary: [
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: <Settings2Icon />,
    },
    {
      title: "Ajuda",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
};

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar>
) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-white/10 bg-[#09090B]"
      {...props}
    >
      <SidebarHeader className="border-b border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<a href="/dashboard" />}
            >
              <Image
                src="/logos/forge-logo.png"
                alt="Forge Finance"
                width={36}
                height={36}
                className="rounded-lg"
              />

              <div className="flex flex-col leading-none">
                <span className="font-bold text-white">
                  Forge Finance
                </span>

                <span className="text-xs text-slate-400">
                  Premium
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />

        <NavSecondary
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}