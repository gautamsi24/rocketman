import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidenav } from "./Sidenav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidenav />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
