import { useEffect } from 'react';

/**
 * SEOHead - Dynamically updates document head with SEO meta tags
 * Usage: <SEOHead title="..." description="..." image="..." url="..." />
 */
export default function SEOHead({
  title = 'Dreamline Bus – Comfort Journeys Across Kenya',
  description = 'Book bus tickets online for Nairobi, Mombasa, Kisumu and more. VIP, Business & Economy seats. Pay with M-Pesa. Instant e-tickets.',
  image = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format',
  url = 'https://dreamline.co.ke',
  type = 'website',
  keywords = 'bus booking Kenya, Nairobi Mombasa bus, online bus ticket, Dreamline bus, M-Pesa bus ticket',
}) {
  useEffect(() => {
    const fullTitle = title.includes('Dreamline') ? title : `${title} | Dreamline Bus`;

    // Title
    document.title = fullTitle;

    const setMeta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', 'index, follow');
    setMeta('author', 'Dreamline Bus Services');

    // Open Graph
    setMeta('og:type', type, 'property');
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:site_name', 'Dreamline Bus Services', 'property');
    setMeta('og:locale', 'en_KE', 'property');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
    setMeta('twitter:site', '@dreamlinebus');

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Schema.org JSON-LD
    const schemaId = 'schema-org-jsonld';
    let schemaEl = document.getElementById(schemaId);
    if (!schemaEl) {
      schemaEl = document.createElement('script');
      schemaEl.id = schemaId;
      schemaEl.type = 'application/ld+json';
      document.head.appendChild(schemaEl);
    }
    schemaEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: 'Dreamline Bus Services',
      url: 'https://dreamline.co.ke',
      logo: 'https://dreamline.co.ke/logo.png',
      description: 'Kenya\'s premier bus booking service',
      telephone: '+254700000000',
      email: 'info@dreamline.co.ke',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Ronald Ngala Street',
        addressLocality: 'Nairobi',
        addressCountry: 'KE',
      },
      sameAs: [
        'https://facebook.com/dreamlinebus',
        'https://twitter.com/dreamlinebus',
      ],
    });
  }, [title, description, image, url, type, keywords]);

  return null;
}