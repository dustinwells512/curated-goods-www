export default function Footer() {
  return (
    <footer className="border-t border-warm-200 bg-warm-100">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-lg font-semibold text-warm-900">
            Curated Goods
          </span>
          <p className="max-w-md text-sm text-warm-500">
            Quality items, personally selected. Each piece has been part of our
            home and is ready for its next chapter.
          </p>
          <p className="mt-4 text-xs text-warm-400">
            &copy; {new Date().getFullYear()} Curated Goods. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
