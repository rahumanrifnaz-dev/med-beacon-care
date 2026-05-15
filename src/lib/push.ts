import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(vapidKey: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported');
  }

  const reg = await navigator.serviceWorker.register('/sw.js');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = sub.toJSON();
  const existing = await supabase.from<any>('push_subscriptions').select('id').eq('endpoint', json.endpoint).maybeSingle();
  if (!existing.data) {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from<any>('push_subscriptions').insert({
      user_id: user?.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    });
  }

  return json;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from<any>('push_subscriptions').delete().eq('endpoint', endpoint);
}
