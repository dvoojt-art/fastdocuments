'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    errorEmitter.on('permission-error', (error) => {
      toast({
        variant: 'destructive',
        title: 'Security Permission Error',
        description: error.message || 'You do not have permission to perform this action.',
      });
    });
  }, [toast]);
  return null;
}
