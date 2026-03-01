import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ItemCard from "@/components/ItemCard";
import ContactForm from "@/components/ContactForm";
import VisitTracker from "@/components/VisitTracker";
import { items, getFeaturedItems, getCategories } from "@/data/items";

export default function Home() {
  const featured = getFeaturedItems();
  const categories = getCategories();
  const nonFeatured = items.filter((item) => !item.featured);

  return (
    <div className="min-h-screen bg-warm-50">
      <VisitTracker />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-warm-900 px-6 py-24 text-center sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-warm-900 via-warm-800 to-accent/30" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Curated Goods
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-warm-300">
            Quality items from my home to yours. Each piece has been personally
            selected and well cared for.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#items"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-warm-900 shadow-sm transition-colors hover:bg-warm-100"
            >
              Browse Items
            </a>
            <a
              href="#contact"
              className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section id="items" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-warm-900">Featured Items</h2>
          <p className="mt-2 text-warm-500">
            Highlight pieces — click for full details
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {featured.map((item) => (
            <ItemCard key={item.id} item={item} featured />
          ))}
        </div>
      </section>

      {/* All Items by Category */}
      {categories.map((category) => {
        const categoryItems = nonFeatured.filter(
          (item) => item.category === category
        );
        if (categoryItems.length === 0) return null;
        return (
          <section
            key={category}
            className="mx-auto max-w-6xl px-6 pb-16"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-warm-900">{category}</h2>
              <div className="mt-1 h-0.5 w-12 bg-accent" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}

      {/* About Section */}
      <section id="about" className="border-t border-warm-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-warm-900">
              About This Sale
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-warm-600">
              I&apos;m downsizing and letting go of some wonderful items that
              have served me well. Everything listed here is in good condition
              and priced to move. I believe in transparency — what you see is
              what you get.
            </p>
            <div className="mt-10 grid gap-8 text-center sm:grid-cols-3">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <svg
                    className="h-6 w-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-3 font-semibold text-warm-900">
                  Quality Guaranteed
                </h3>
                <p className="mt-1 text-sm text-warm-500">
                  Every item is honestly described and in the condition stated.
                </p>
              </div>
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <svg
                    className="h-6 w-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                </div>
                <h3 className="mt-3 font-semibold text-warm-900">
                  Easy Communication
                </h3>
                <p className="mt-1 text-sm text-warm-500">
                  Ask questions, make offers, or schedule a viewing.
                </p>
              </div>
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <svg
                    className="h-6 w-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mt-3 font-semibold text-warm-900">
                  Fair Pricing
                </h3>
                <p className="mt-1 text-sm text-warm-500">
                  Reasonable prices with room to discuss. I want these items to
                  find good homes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Inquiry Form */}
      <section
        id="contact"
        className="border-t border-warm-200 bg-warm-100"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-warm-900">
                Interested in Something?
              </h2>
              <p className="mt-2 text-warm-500">
                Send me a message and I&apos;ll get back to you quickly.
              </p>
            </div>
            <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm sm:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
