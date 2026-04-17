import { Navbar } from "@/components/Navbar";
import { ChatWidget } from "@/components/ChatWidget.client";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="mb-4 text-4xl font-semibold">Eth Silesia</h1>
          <p className="text-gray-600">
            Porozmawiaj z asystentem w prawym dolnym rogu.
          </p>
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
