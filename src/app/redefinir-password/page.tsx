import { redirect } from 'next/navigation';

/** Alias do link enviado por e-mail → página /repor-password */
export default function RedefinirAlias({ searchParams }: { searchParams: { token?: string } }) {
  redirect(`/repor-password${searchParams.token ? `?token=${encodeURIComponent(searchParams.token)}` : ''}`);
}
