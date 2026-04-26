import ContactSearch from "@/components/ContactSearch";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 px-4 py-4 border-b border-border bg-card/90 backdrop-blur-sm">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          GHL Sender
        </h1>
      </header>
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <ContactSearch />
      </main>
    </div>
  );
}
