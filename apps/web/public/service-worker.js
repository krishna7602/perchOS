self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    let title = 'New Order Arrived!';
    let body = `Order ${data.order_token} for ₹${data.total || 0}`;
    let actions = [];

    if (data.type === 'new_order') {
      title = 'New Order Arrived!';
      body = `Order ${data.order_token} for ₹${data.total}`;
      actions = [
        { action: 'accept', title: 'Accept Order' },
        { action: 'reject', title: 'Reject Order' }
      ];
    } else if (data.type === 'order_ready') {
      title = 'Order Ready for Pickup!';
      body = data.message || `Order ${data.order_token} is ready for pickup.`;
      actions = [
        { action: 'accept', title: 'Accept' }
      ];
    }

    const options = {
      body: body,
      icon: '/favicon.ico',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      requireInteraction: true,
      data: data,
      actions: actions
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const orderId = event.notification.data.order_id;
  
  // We need to fetch the token from IndexedDB or assume it's attached, 
  // but for a pure background task we might need to send a message to clients.
  // A simple robust way is to open the admin dashboard if no action is clicked.
  
  if (!event.action) {
    event.waitUntil(clients.openWindow('/admin/dashboard'));
    return;
  }

  // To do authenticated requests in SW without token, it's tricky.
  // But we can forward the action to all open client tabs.
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        client.postMessage({
          type: 'order_action',
          action: event.action,
          order_id: orderId
        });
      }
      if (windowClients.length === 0) {
        // App is closed. 
        clients.openWindow('/admin/dashboard');
      }
    })
  );
});
