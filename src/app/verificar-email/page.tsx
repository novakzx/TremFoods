import { redirect } from 'next/navigation';

/** Alias do link enviado por e-mail → página /verificar */
export default function VerifyEmailAlias({ searchParams }: { searchParams: { token?: string; email?: string } }) {
  const q = new URLSearchParams();
  if (searchParams.token) q.set('token', searchParams.token);
  if (searchParams.email) q.set('email', searchParams.email);
  redirect(`/verificar${q.toString() ? `?${q.toString()}` : ''}`);
}
