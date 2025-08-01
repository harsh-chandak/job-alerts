// src/pages/index.js
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    // Just a dummy check, replace with real auth
    if (email === 'harshnchandak@gmail.com' && password === '12345678') {
      router.push('/home');
    } else {
      alert('❌ Invalid credentials');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <script src="https://cdn.tailwindcss.com"></script>
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
        <Button className="w-full" onClick={handleLogin}>
          Login
        </Button>
      </div>
    </main>
  );
}
