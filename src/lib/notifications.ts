'use client';

import { collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';

export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error';
export interface CreateNotificationInput {
  title: string;
  message: string;
  type: NotificationType;
  targetUid?: string;
  link?: string;
}

export function createNotification(db: Firestore, input: CreateNotificationInput) {
  const notificationsRef = collection(db, 'notifications');
  
  addDoc(notificationsRef, {
    ...input,
    targetUid: input.targetUid || 'global',
    isRead: false,
    createdAt: serverTimestamp(),
  }).catch((err) => {
    console.error('Failed to create notification:', err);
  });
}
