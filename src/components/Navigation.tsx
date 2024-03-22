import { ConnectButton } from "@rainbow-me/rainbowkit";
export default function Navigation() {
  return (
    <main className="flex justify-between items-center">
      <h1 className="font-mono text-[38px] text-[#0E76FD] font-[800]">
        AI NFT Generator
      </h1>
      <ConnectButton />
    </main>
  );
}
