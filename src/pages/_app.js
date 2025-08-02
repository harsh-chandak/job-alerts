// pages/_app.js
import Layout from "@/components/layout";
import Script from "next/script";
import Head from 'next/head';
const pagesWithoutLayout = ["/", "/forgot", "/register"];

function MyApp({ Component, pageProps, router }) {
  const isLayoutExcluded = pagesWithoutLayout.includes(router.pathname);
  
  return (
    <>
    <Head>
        <link rel="icon" href="/favicon.ico" />
        <title>Job Alerts By harsh-chandak</title>
        <meta name="description" content="Harsh Chandak – Full-stack developer and backend engineer specializing in Node.js, Fastify, TypeScript, PostgreSQL, and scalable systems." />
        <meta name="keywords" content="Harsh Chandak, Full Stack Developer, Backend Developer, Node.js, TypeScript, PostgreSQL, Fastify, ASU Developer, Harsh.dev, Software Engineer Portfolio, ASU, Arizona State University, Matser's, MS, MSCS, Computer Science, Web Developer, Harsh Chandak, Harsh ASU, Harsh Portfolio" />
        <meta name="author" content="Harsh Chandak" />
      </Head>
      {/* Load Tailwind from CDN if needed */}
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />

      {isLayoutExcluded ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </>
  );
}

export default MyApp;
