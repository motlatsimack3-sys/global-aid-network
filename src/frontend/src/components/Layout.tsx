import { SignInButton } from "@/components/InternetIdentity";
import { useIsCallerAdmin } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import { Heart, Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";

const navLinks = [
  { label: "Causes", to: "/" as const, hash: "causes" },
  { label: "Stories", to: "/" as const, hash: "stories" },
  { label: "About Us", to: "/" as const, hash: "about" },
  { label: "Contact", to: "/" as const, hash: "contact" },
];

function Wordmark() {
  return (
    <Link
      to="/"
      data-ocid="nav.home_link"
      className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Heart className="size-4" aria-hidden="true" />
      </span>
      Common Ground
    </Link>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { identity } = useInternetIdentity();
  const authenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const { data: isAdmin } = useIsCallerAdmin();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Wordmark />
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              hash={link.hash}
              data-ocid={`nav.${link.label.toLowerCase().replace(/\s+/g, "_")}_link`}
              className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {authenticated && isAdmin && (
            <Link
              to="/admin"
              data-ocid="nav.admin_link"
              className="text-sm font-medium text-primary transition-smooth hover:text-primary/80"
            >
              Owner Tools
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <SignInButton className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-muted disabled:opacity-60 sm:inline-flex" />
          <Link
            to="/"
            hash="causes"
            data-ocid="nav.donate_button"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:bg-primary/90 hover:shadow-elevated"
          >
            Donate
          </Link>
          <button
            type="button"
            data-ocid="nav.menu_toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-smooth hover:bg-muted md:hidden"
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-border bg-card px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  hash={link.hash}
                  onClick={() => setOpen(false)}
                  data-ocid={`nav.mobile_${link.label.toLowerCase().replace(/\s+/g, "_")}_link`}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {authenticated && isAdmin && (
              <li>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  data-ocid="nav.mobile_admin_link"
                  className="block rounded-md px-3 py-2 text-sm font-medium text-primary transition-smooth hover:bg-muted"
                >
                  Owner Tools
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}

const footerColumns = [
  {
    title: "Causes",
    links: [
      { label: "Nepal Earthquake Relief", to: "/" as const, hash: "causes" },
      { label: "Africa Water & Food", to: "/" as const, hash: "causes" },
      { label: "All Causes", to: "/" as const, hash: "causes" },
    ],
  },
  {
    title: "About Us",
    links: [
      { label: "Our Mission", to: "/" as const, hash: "about" },
      { label: "Stories", to: "/" as const, hash: "stories" },
      { label: "Contact", to: "/" as const, hash: "contact" },
    ],
  },
];

function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="space-y-3">
          <p className="font-display text-lg font-bold">Common Ground</p>
          <p className="text-sm leading-relaxed text-background/70">
            Dedicated humanitarian relief for communities rebuilding after
            disaster and reaching for clean water, food and medicine.
          </p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-background/60">
              {column.title}
            </p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    hash={link.hash}
                    className="text-sm text-background/80 transition-smooth hover:text-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-background/60">
            Payment Method
          </p>
          <p className="text-sm text-background/80">
            Secure card, PayPal and Apple Pay checkout, processed worldwide.
          </p>
        </div>
      </div>
      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-background/60 md:flex-row md:px-6">
          <p>
            © {new Date().getFullYear()} Common Ground. All rights reserved.
          </p>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="transition-smooth hover:text-background"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Shared application shell: sticky header, content area and dark editorial footer. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background")}>
      <Header />
      <main className="flex-1 bg-background">{children}</main>
      <Footer />
    </div>
  );
}
