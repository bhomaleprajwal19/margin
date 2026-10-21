import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound">
      <div className="eyebrow">Error 404</div>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Go to the overview</Link>
      </p>
    </div>
  );
}
