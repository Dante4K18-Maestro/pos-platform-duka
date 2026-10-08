// Register surface: pages here hand off to the register at /pos, so this
// layout stays a plain passthrough.
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
