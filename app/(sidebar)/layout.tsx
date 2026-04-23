"use client";

import Sidebar from "@/components/custom/sidebar";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060b17]">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <motion.main
        initial={false}
        animate={{ marginLeft: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-1 flex-col overflow-hidden pt-20 px-6 pb-6"
      >
        {children}
      </motion.main>
    </div>
  );
}
