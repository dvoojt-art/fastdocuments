'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, ExternalLink, Loader2, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { User } from 'firebase/auth';
import { query, collection, limit, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NotificationBellProps {
  role: 'admin' | 'member' | null;
  user: User | null | undefined;
}

export function NotificationBell({ role, user }: NotificationBellProps) {
  const db = useFirestore();
  const [open, setOpen] = useState(false);
  const isAdmin = role === 'admin';

  // Track previous notifications to detect NEW ones
  const prevIdsRef = useRef<string[]>([]);

  // -----------------------------
  // Firestore query
  // -----------------------------
  const notificationsQuery = useMemoFirebase(() => {
    if (!db) return null;

    if (isAdmin) {
      return query(
        collection(db, 'notifications'),
       
        limit(20)
      );
    }

    if (user?.email) {
      return query(
        collection(db, "notifications"),
        where("recipient", "in", ["all_members", user.email.toLowerCase()]),
        
        limit(10)
      );
    }

    return null;
  }, [db, isAdmin, user?.email]);

  const { data: notifications, loading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;
  const prevCountRef = useRef(0);

    useEffect(() => {
      if (!notifications) return;

  const currentUnread = notifications.filter(n => !n.isRead).length;

  // play sound only when unread count increases
    if (currentUnread > prevCountRef.current) {
      playSound();
    }

    prevCountRef.current = currentUnread;
    }, [notifications]);
  // -----------------------------
  // MARK AS READ
  // -----------------------------
  const markAsRead = async (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'notifications', id);
    updateDoc(docRef, { isRead: true }).catch(console.error);
  };

  // -----------------------------
  // DELETE SINGLE
  // -----------------------------
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db) return;

    const docRef = doc(db, 'notifications', id);

    try {
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
    };

  // -----------------------------
  // CLEAR ALL
  // -----------------------------
  const handleClearAll = async () => {
    if (!db || !notifications || notifications.length === 0) return;

    const batch = writeBatch(db);

    notifications.forEach((n) => {
      const docRef = doc(db, 'notifications', n.id);
      batch.delete(docRef);
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  // -----------------------------
  // ICONS
  // -----------------------------
  const getIcon = (type: string) => {
    switch (type) {
      case 'Success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'Warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'Error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // -----------------------------
  // 🔊 SOUND SYSTEM
  // -----------------------------
  const playSound = () => {
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const getSoundByPriority = (priority?: string) => {
    switch (priority) {
      case 'HR':
        return '/sounds/hr.mp3';
      case 'Security':
        return '/sounds/security.mp3';
      case 'System':
      default:
        return '/sounds/system.mp3';
    }
  };

  // -----------------------------
  // DETECT NEW NOTIFICATIONS
  // -----------------------------
  useEffect(() => {
    if (!notifications) return;

    const currentIds = notifications.map((n) => n.id);
    const newNotifications = notifications.filter(
      (n) => !prevIdsRef.current.includes(n.id)
    );

    // Play sounds ONLY when popover is closed
    if (newNotifications.length > 0 && !open) {
      newNotifications.forEach((n) => {
        playSound();
      });
    }

    prevIdsRef.current = currentIds;
  }, [notifications, open]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-white/10 text-white"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground font-bold border-2 border-[#0f326e] animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 shadow-2xl border-2 border-foreground" align="end">
        <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
          <h4 className="font-headline font-bold uppercase text-xs tracking-widest">
            Notifications
          </h4>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-primary uppercase">
              {unreadCount} New
            </span>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center opacity-40">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Syncing alerts...
              </p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-default relative',
                    !n.isRead && 'bg-primary/5'
                  )}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div className="space-y-1">
                      <p
                        className={cn(
                          'text-xs font-bold leading-none',
                          !n.isRead && 'text-primary'
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-[10px] leading-tight opacity-60 font-medium">
                        {n.message}
                      </p>
                      {!n.isRead && (
                        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      {isAdmin && n.link && (
                        <Link
                          href={n.link}
                          className="flex items-center gap-1 text-[9px] font-bold uppercase text-primary hover:underline mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                          }}
                        >
                          View Details{' '}
                          <ExternalLink className="h-2 w-2" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center opacity-30 flex flex-col items-center justify-center">
              <Bell className="h-10 w-10 mb-2" />
              <p className="font-bold text-[10px] uppercase tracking-widest">
                No notifications
              </p>
            </div>
          )}
        </ScrollArea>

        {isAdmin && (
          <div className="p-2 bg-muted/30 border-t grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full font-bold text-[10px] uppercase tracking-widest h-8 text-destructive hover:text-destructive"
              onClick={handleClearAll}
              disabled={!notifications || notifications.length === 0}
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Clear All
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full font-bold text-[10px] uppercase tracking-widest h-8"
              onClick={() => setOpen(false)}
            >
              <Link href="/dashboard/logs">View All</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}