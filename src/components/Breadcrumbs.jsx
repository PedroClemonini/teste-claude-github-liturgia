import Link from 'next/link';

/** @param {{items: {label: string, href?: string}[]}} props */
export function Breadcrumbs({ items }) {
  return (
    <nav className="ui-breadcrumbs" aria-label="Trilha de navegação">
      <ol>
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
