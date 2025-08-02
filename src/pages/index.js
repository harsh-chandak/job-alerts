// src/pages/index.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const handleLogin = async () => {
    localStorage.clear()
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);  // remove await here
      console.log('Token saved:', localStorage.getItem('token'));
      router.push('/home');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.push('/home');
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">🔐 Job Alerts Login</h1>
      <div className="w-full max-w-sm space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <Button className="w-full" onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button
          variant="outline"
          className="w-full text-blue-600 border-blue-400 hover:bg-blue-50"
          onClick={() => router.push('/register')}
        >
          Create an account
        </Button>
        <Button
          variant="ghost"
          className="w-full text-sm text-gray-600 hover:text-blue-600"
          onClick={() => router.push('/forgot')}
        >
          Forgot Password?
        </Button>
      </div>
    </main>
  );
}
