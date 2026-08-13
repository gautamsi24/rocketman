import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PodcastPlaybackProvider } from "./PodcastPlaybackProvider";
import { Sidenav } from "./Sidenav";
import { getSession } from "@/lib/auth/dal";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PodcastPlaybackProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidenav role={session.role} />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </PodcastPlaybackProvider>
  );
}
