export function StaticPage({ title, intro, children }) {
  return (
    <div className="container page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span>/</span>
        <span>{title}</span>
      </div>
      <h1 className="h1">{title}</h1>
      {intro ? (
        <p className="lead" style={{ margin: '10px 0 8px' }}>
          {intro}
        </p>
      ) : null}
      <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 24 }}>
        Last updated {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
      </p>
      <div className="prose">{children}</div>
    </div>
  );
}
