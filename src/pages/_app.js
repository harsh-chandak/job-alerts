// pages/_app.js
import Layout from '@/components/layout';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      {/* Load Tailwind from CDN */}
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Component {...pageProps} />
    </Layout>
  );
}
