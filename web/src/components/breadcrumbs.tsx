import { Link } from "react-router-dom"

export default function Breadcrumbs({ crumbs }: { crumbs: any[] }) {
  return (
    <div className="breadcrumbs">
      {crumbs.map((crumb, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep"> / </span>}

          {crumb.to ? (
            <Link to={crumb.to}>{crumb.name}</Link>
          ) : (
            <span>{crumb.name}</span>
          )}
        </span>
      ))}
    </div>
  )
}
