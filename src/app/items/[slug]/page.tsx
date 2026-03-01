import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InquiryForm from "@/components/InquiryForm";
import { items, getItemBySlug } from "@/data/items";

export function generateStaticParams() {
  return items
    .filter((item) => item.hasDedicatedPage)
    .map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) return { title: "Item Not Found" };
  return {
    title: `${item.title} | Curated Goods`,
    description: item.description,
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item || !item.hasDedicatedPage) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <Header />

      {/* Breadcrumb */}
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <nav className="flex items-center gap-2 text-sm text-warm-400">
          <Link href="/" className="transition-colors hover:text-warm-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/#items" className="transition-colors hover:text-warm-600">
            Items
          </Link>
          <span>/</span>
          <span className="text-warm-700">{item.title}</span>
        </nav>
      </div>

      {/* Item Detail */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Image Area */}
          <div className="image-placeholder flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl">
            <div className="text-center">
              <svg
                className="mx-auto h-24 w-24 text-warm-400/60"
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
              <p className="mt-3 text-sm text-warm-500">
                Photo coming soon
              </p>
            </div>
          </div>

          {/* Details */}
          <div>
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {item.category}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-warm-900 sm:text-4xl">
              {item.title}
            </h1>
            <p className="mt-1 text-lg text-warm-500">{item.subtitle}</p>

            <div className="mt-6 flex items-center gap-4">
              <span className="text-2xl font-bold text-accent">
                {item.price}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  item.status === "available"
                    ? "bg-green-100 text-green-800"
                    : item.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-warm-200 text-warm-600"
                }`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            </div>

            <p className="mt-6 text-base leading-relaxed text-warm-600">
              {item.description}
            </p>

            {/* Details List */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-warm-400">
                Details
              </h3>
              <ul className="mt-3 space-y-2">
                {item.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-3 text-warm-700">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#inquire"
                className="rounded-lg bg-accent px-8 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-light"
              >
                Inquire About This Item
              </a>
              <a
                href="#inquire"
                className="rounded-lg border border-warm-300 px-8 py-3 text-center text-sm font-semibold text-warm-700 transition-colors hover:bg-warm-100"
              >
                Make an Offer
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section
        id="inquire"
        className="border-t border-warm-200 bg-warm-100"
      >
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-warm-900">
                Interested in the {item.title}?
              </h2>
              <p className="mt-2 text-warm-500">
                Send us a message and we&apos;ll get back to you.
              </p>
            </div>
            <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm sm:p-8">
              <InquiryForm preselectedItem={item.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Back to all items */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/#items"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-light"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to All Items
        </Link>
      </div>

      <Footer />
    </div>
  );
}
