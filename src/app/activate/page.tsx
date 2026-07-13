'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { toast } from 'sonner';

export default function ActivateAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const activateAccount = async () => {
    try {
      setLoading(true);

      // Validate input
      if (!email.trim() || !password.trim()) {
        toast.error('Email and password are required.');
        return;
      }

      // Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Query employee
      const employeeQuery = query(
        collection(db, 'employees'),
        where('email', '==', email.trim())
      );

      const snapshot = await getDocs(employeeQuery);

      if (snapshot.empty) {
        await deleteUser(userCredential.user);

        toast.error(
          'Your email is not registered. Please contact the HR administrator.'
        );
        return;
      }

      const employeeDoc = snapshot.docs[0];
      const employeeData = employeeDoc.data();

      if (employeeData.activated === true) {
        await deleteUser(userCredential.user);

        toast.error('This account has already been activated.');
        return;
      }

      await updateDoc(employeeDoc.ref, {
        uid: userCredential.user.uid,
        activated: true,
        activatedAt: new Date(),
      });

      toast.success('Account activated successfully!');

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);

      switch (error.code) {
        case 'auth/email-already-in-use':
          toast.error('This email has already been activated.');
          break;

        case 'auth/invalid-email':
          toast.error('Invalid email address.');
          break;

        case 'auth/weak-password':
          toast.error('Password must be at least 6 characters.');
          break;

        case 'auth/network-request-failed':
          toast.error('Network error. Please try again.');
          break;

        case 'permission-denied':
        case 'firestore/permission-denied':
          toast.error(
            'Firestore permission denied. Check your Firestore Security Rules.'
          );
          break;

        default:
          toast.error(error.message || 'Unable to activate account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />

      <button onClick={activateAccount} disabled={loading}>
        {loading ? 'Activating...' : 'Activate Account'}
      </button>
    </div>
  );
}