"use client";

import { useEffect, useRef } from "react";
import { listVenues } from "@/features/venues/api";
import { listVenueOrders } from "@/features/orders/api";

import { playNotificationSound } from "@/lib/audio";

export function useOrderNotifier(token: string) {
  const previousOrders = useRef<Record<string, { status: string, total: number }>>({});
  
  useEffect(() => {
    if (!token) return;

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let isMounted = true;

    const checkOrders = async () => {
      if (!isMounted) return;
      
      try {
        const venuesRes = await listVenues(token);
        if (!venuesRes.venues || venuesRes.venues.length === 0) return;
        
        for (const venue of venuesRes.venues) {
          const bid = String(venue._id || venue.id);
          const ordersRes = await listVenueOrders(bid, token);
          const orders = ordersRes.orders || [];
          
          let showNotification = false;
          let notifTitle = "";
          let notifBody = "";

          for (const order of orders) {
             const oid = String(order._id || order.id);
             const currentStatus = order.order_status;
             
             if (!previousOrders.current[oid]) {
                // New Order
                // Only alert for 'received' new orders so we don't spam historical orders on load
                if (currentStatus === "received" && Object.keys(previousOrders.current).length > 0) {
                   showNotification = true;
                   notifTitle = `New Order Arrived!`;
                   notifBody = `Order #${oid.substring(0, 6).toUpperCase()} at ${venue.name} for ₹${order.total}`;
                }
             } else {
                // Existing order, check status change
                const prev = previousOrders.current[oid];
                if (prev.status !== currentStatus && currentStatus !== "served") {
                   showNotification = true;
                   notifTitle = `Order Status Update`;
                   notifBody = `Order #${oid.substring(0, 6).toUpperCase()} is now ${currentStatus}`;
                }
             }
             
             previousOrders.current[oid] = { status: currentStatus, total: order.total };
          }

          if (showNotification) {
             playNotificationSound();
             if ("Notification" in window && Notification.permission === "granted") {
                new Notification(notifTitle, { body: notifBody, icon: "/favicon.ico" });
             }
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    };

    // Wait a short moment to allow first render/login to settle, then check
    setTimeout(checkOrders, 2000);
    const intervalId = setInterval(checkOrders, 15000); // Check every 15s to be polite to the backend

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [token]);
}
