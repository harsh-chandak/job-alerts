import { useState } from 'react';
import { useRouter } from 'next/router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', name: '', mongo_uri:'', discord_uri:'' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      alert('✅ Account created. Please log in.');
      localStorage.clear()
      router.push('/');
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">📝 Register</h1>
      <div className="w-full max-w-sm space-y-4">
        <Input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} />
        <Input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} />
        <Input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} />
        <Input type="mongo_uri" name="mongo_uri" placeholder="Mongo DB URL" value={form.mongo_uri} onChange={handleChange} />
        <Input type="discord_uri" name="discord_uri" placeholder="Discord Webhook Endpoint" value={form.discord_uri} onChange={handleChange} />
        <Button className="w-full" onClick={handleRegister} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </Button>
        <p className="text-center text-sm text-gray-600">
          Already have an account? <a href="/" className="text-blue-600 hover:underline">Login</a>
        </p>
      </div>
    </main>
  );
}
