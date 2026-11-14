/** Each route enters with a short fade + blur (transitions.dev "skeleton reveal"). */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="t-page-reveal">{children}</div>;
}
