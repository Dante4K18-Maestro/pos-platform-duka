// Shared placeholder for sections that have a designed page and a valid link
// but whose backend slice has not landed yet. Never render a blank page.
export function ComingSoon({
  title,
  description,
  icon = "🚧",
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className="card">
      <div className="soon">
        <div className="icon">{icon}</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
