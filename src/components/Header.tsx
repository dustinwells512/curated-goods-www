"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-warm-200 bg-warm-50/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-warm-900">
            Curated Goods
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/#items"
            className="text-sm font-medium text-warm-600 transition-colors hover:text-warm-900"
          >
            Browse Items
          </Link>
          <Link
            href="/#about"
            className="text-sm font-medium text-warm-600 transition-colors hover:text-warm-900"
          >
            About
          </Link>
          <Link
            href="/#contact"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-light"
          >
            Contact
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-warm-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-warm-200 bg-warm-50 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="/#items"
              className="text-sm font-medium text-warm-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Items
            </Link>
            <Link
              href="/#about"
              className="text-sm font-medium text-warm-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="inline-block rounded-full bg-accent px-5 py-2 text-center text-sm font-medium text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
