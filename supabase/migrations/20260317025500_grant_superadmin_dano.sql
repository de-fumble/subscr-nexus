-- Grant superadmin privileges to oyewoledano@gmail.com
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user ID based on email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'oyewoledano@gmail.com';

  -- If the user exists, insert the superadmin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'superadmin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE NOTICE 'User oyewoledano@gmail.com not found in auth.users';
  END IF;
END $$;
