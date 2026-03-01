import Image from "next/image";
import Link from "next/link";
import type { Item } from "@/data/items";

function StatusBadge({ status }: { status: Item["status"] }) {
  const styles = {
    available: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    sold: "bg-warm-200 text-warm-600",
  };

  return (
    <span
      className={`absolute right-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ImageArea({
  item,
  featured,
}: {
  item: Item;
  featured: boolean;
}) {
  const hasImages = item.images.length > 0;

  if (hasImages) {
    return (
      <div
        className={`relative overflow-hidden ${featured ? "h-72 sm:h-80" : "h-52"}`}
      >
        <Image
          src={item.images[0]}
          alt={item.imageAlt}
          fill
          className="object-cover"
          sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        />
        <StatusBadge status={item.status} />
        <span className="absolute left-3 top-3 z-10 rounded-full bg-warm-900/70 px-3 py-1 text-xs font-medium text-white">
          {item.category}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`image-placeholder relative overflow-hidden ${featured ? "h-72 sm:h-80" : "h-52"}`}
    >
      <div className="flex h-full items-center justify-center">
        <svg
          className="h-16 w-16 text-warm-400/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <StatusBadge status={item.status} />
      <span className="absolute left-3 top-3 z-10 rounded-full bg-warm-900/70 px-3 py-1 text-xs font-medium text-white">
        {item.category}
      </span>
    </div>
  );
}

export default function ItemCard({
  item,
  featured = false,
}: {
  item: Item;
  featured?: boolean;
}) {
  const hasLink = item.hasDedicatedPage || item.externalUrl;
  const linkTarget = item.externalUrl || `/items/${item.slug}`;
  const isExternal = !!item.externalUrl;

  const CardContent = () => (
    <>
      <ImageArea item={item} featured={featured} />
      <div className={`p-5 ${featured ? "p-6" : ""}`}>
        <h3
          className={`font-semibold text-warm-900 ${featured ? "text-xl" : "text-lg"}`}
        >
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-warm-500">{item.subtitle}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-accent">
            {item.price}
          </span>
          {hasLink && (
            <span className="text-sm font-medium text-accent">
              {isExternal ? "View Full Details" : "View Details"} &rarr;
            </span>
          )}
        </div>
        {!hasLink && (
          <p className="mt-3 text-sm leading-relaxed text-warm-600">
            {item.description}
          </p>
        )}
        {featured && !isExternal && !item.hasDedicatedPage && (
          <p className="mt-3 text-sm leading-relaxed text-warm-600">
            {item.description}
          </p>
        )}
      </div>
    </>
  );

  // External link (like the piano site)
  if (isExternal) {
    return (
      <a
        href={linkTarget}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-xl border border-warm-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-warm-300"
      >
        <CardContent />
      </a>
    );
  }

  // Internal dedicated page
  if (item.hasDedicatedPage) {
    return (
      <Link
        href={linkTarget}
        className="group block overflow-hidden rounded-xl border border-warm-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-warm-300"
      >
        <CardContent />
      </Link>
    );
  }

  // Inline item with inquiry button
  return (
    <div className="overflow-hidden rounded-xl border border-warm-200 bg-white shadow-sm">
      <CardContent />
      <div className="border-t border-warm-100 px-5 py-3">
        <a
          href="#contact"
          className="block rounded-lg bg-accent py-2 text-center text-sm font-medium text-white transition-colors hover:bg-accent-light"
        >
          Inquire About This Item
        </a>
      </div>
    </div>
  );
}
