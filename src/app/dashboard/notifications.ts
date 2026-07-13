import { addDoc, collection, serverTimestamp, type Firestore } from "firebase/firestore";

type NotificationType = "Success" | "Error" | "Info" | "Warning";

interface CreateNotificationProps {
  db: Firestore;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export const createNotification = async ({
  db,
  userId,
  title,
  message,
  type,
  link,
}: CreateNotificationProps) => {
  try {
    await addDoc(collection(db, "notifications"), {
      targetUid: userId,
      title,
      message,
      type,
      link: link || "/dashboard",
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Optionally, you could add further error handling here.
  }
};