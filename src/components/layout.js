import Link from 'next/link';

export default function Layout({ children }) {
  return (
      <div>
        
      <nav className="bg-gray-800 text-white px-4 py-3 flex gap-6">
        <Link href="/home">Home</Link>
        <Link href="/companies">Companies</Link>
        <Link href="/alerts">Alerts</Link>
        <Link href="/settings">Settings</Link>
      </nav>
      <main>
        <script src="https://cdn.tailwindcss.com"></script>{children}</main>
    </div>
  );
}
