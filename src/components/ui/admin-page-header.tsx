import Link from 'next/link';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminPageHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  subtitle?: string;
};

export function AdminPageHeader({
  breadcrumbs,
  title,
  subtitle,
}: AdminPageHeaderProps) {
  return (
    <header className="space-y-1">
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link
                href={item.href}
                className="transition hover:text-stone-900"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-stone-700">{item.label}</span>
            )}
            {i < breadcrumbs.length - 1 && (
              <span className="text-stone-400">/</span>
            )}
          </span>
        ))}
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900 md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-2xl text-sm font-medium text-stone-600">
          {subtitle}
        </p>
      )}
    </header>
  );
}
