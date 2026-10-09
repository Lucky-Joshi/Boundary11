import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="container page">
      <div className="empty" style={{ padding: '90px 24px' }}>
        <p className="eyebrow">404</p>
        <h1 className="h1" style={{ margin: '10px 0' }}>
          That page is out of bounds
        </h1>
        <p>The page you were looking for doesn&rsquo;t exist or has been moved.</p>
        <div className="row" style={{ gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/shop" className="btn btn-outline">
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
