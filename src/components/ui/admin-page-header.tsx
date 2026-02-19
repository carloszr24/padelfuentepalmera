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
      <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#6b6b6b]">
        {breadcrumbs.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="transition hover:text-[#1a1a1a]">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#1a1a1a]">{item.label}</span>
            )}
            {i < breadcrumbs.length - 1 && (
              <span className="text-[#a3a3a3]">/</span>
            )}
          </span>
        ))}
      </nav>
      <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a] md:text-2xl" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-2xl text-[13px] text-[#6b6b6b]">
          {subtitle}
        </p>
      )}
    </header>
  );
}
