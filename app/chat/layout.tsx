export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="!pb-0" style={{ paddingBottom: 0 }}>
      {children}
    </div>
  );
}
