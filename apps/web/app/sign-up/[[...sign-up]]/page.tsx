import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <SignUp />
    </main>
  );
}
