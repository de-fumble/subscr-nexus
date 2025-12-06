-- Update the handle_new_user trigger to skip organization creation for staff accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip organization creation for staff accounts (they're added to existing orgs)
  IF (NEW.raw_user_meta_data->>'is_staff')::boolean = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organizations (user_id, org_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'),
    NEW.email
  );
  RETURN NEW;
END;
$function$;