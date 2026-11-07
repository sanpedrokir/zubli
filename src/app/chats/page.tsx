import type { Metadata } from "next";
import { ChatList } from "@/features/chat/chat-list";

export const metadata: Metadata = { title: "Chats" };

export default function Page() {
  return <ChatList />;
}
