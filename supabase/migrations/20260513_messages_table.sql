-- Messages table for doctor-patient communication
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Messages: own send/receive" ON public.messages FOR ALL
  USING (sender_id = auth.uid() OR receiver_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Messages: delete own" ON public.messages FOR DELETE
  USING (sender_id = auth.uid());

-- Hardened function to create notification when message is sent.
-- Any failures inside the notification insert are caught so the parent
-- messages insert is not aborted by a notification failure.
CREATE OR REPLACE FUNCTION notify_message_received()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      NEW.receiver_id,
      'message',
      'New Message',
      'You have a new message from your care team'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Swallow errors from notifications to avoid breaking the main transaction.
    RAISE NOTICE 'notify_message_received failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on new message
CREATE TRIGGER message_notification_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_received();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
