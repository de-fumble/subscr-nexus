
-- Add a 4-digit profile number column to billing_profiles
ALTER TABLE public.billing_profiles 
ADD COLUMN profile_number TEXT UNIQUE;

-- Create a function to generate unique 4-digit profile numbers
CREATE OR REPLACE FUNCTION public.generate_profile_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number TEXT;
  existing_count INTEGER;
BEGIN
  LOOP
    -- Generate a random 4-digit number (1000-9999)
    new_number := LPAD(FLOOR(1000 + random() * 9000)::TEXT, 4, '0');
    
    -- Check if it already exists
    SELECT COUNT(*) INTO existing_count 
    FROM public.billing_profiles 
    WHERE profile_number = new_number;
    
    -- If unique, use it
    IF existing_count = 0 THEN
      NEW.profile_number := new_number;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate profile numbers on insert
CREATE TRIGGER set_profile_number
BEFORE INSERT ON public.billing_profiles
FOR EACH ROW
WHEN (NEW.profile_number IS NULL)
EXECUTE FUNCTION public.generate_profile_number();
