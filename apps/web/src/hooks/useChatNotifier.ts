"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { getTeamChannels, getTeamMessages } from "@/features/chat/api";
import { listVenues } from "@/features/venues/api";

export function useChatNotifier(token: string) {
  const [hasUnread, setHasUnread] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const pathname = usePathname();
  const lastMessageCount = useRef<Record<string, number>>({});
  
  useEffect(() => {
    if (!token) return;

    let branchId = "";
    try {
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(payloadBase64));
      branchId = payload.branch_id || "";
    } catch (e) {}

    let isMounted = true;

    const checkMessages = async () => {
      if (!isMounted) return;
      
      try {
        let bid = branchId;
        if (!bid) {
           const venuesRes = await listVenues(token);
           if (venuesRes.venues && venuesRes.venues.length > 0) {
              bid = String(venuesRes.venues[0]._id || venuesRes.venues[0].id);
           }
        }
        
        if (!bid) return;

        const channelsRes = await getTeamChannels(bid, token);
        if (!channelsRes.channels || channelsRes.channels.length === 0) return;
        
        const mainChannel = channelsRes.channels[0].id;
        const msgRes = await getTeamMessages(mainChannel, token);
        const msgs = msgRes.messages || [];
        
        const count = msgs.length;
        const previousCount = lastMessageCount.current[mainChannel];
        
        if (previousCount !== undefined && count > previousCount) {
           // We have new messages!
           const newMsg = msgs[msgs.length - 1];
           
           // If we are not on the chat page, show notification
           if (window.location.pathname !== "/admin/chat") {
             setHasUnread(true);
             setPopupMessage(`${newMsg.sender_name}: ${newMsg.content.substring(0, 30)}...`);
             setShowPopup(true);
             
             // Hide popup after 4 seconds
             setTimeout(() => {
               if (isMounted) setShowPopup(false);
             }, 4000);
           }
        }
        
        lastMessageCount.current[mainChannel] = count;
      } catch (e) {
        // ignore polling errors
      }
    };

    checkMessages();
    const intervalId = setInterval(checkMessages, 5000); // Check every 5s globally

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [token]);
  
  // Clear unread if we navigate to chat
  useEffect(() => {
    if (pathname === "/admin/chat") {
      setHasUnread(false);
      setShowPopup(false);
    }
  }, [pathname]);

  return { hasUnread, showPopup, popupMessage, setShowPopup };
}
