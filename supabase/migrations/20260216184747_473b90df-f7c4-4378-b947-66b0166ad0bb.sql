
-- Create driver_locations table for GPS fleet tracking
CREATE TABLE public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID,
  fir_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Users can insert their own location
CREATE POLICY "Users can insert own location"
  ON public.driver_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own locations
CREATE POLICY "Users can view own locations"
  ON public.driver_locations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
  ON public.driver_locations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete locations
CREATE POLICY "Admins can delete locations"
  ON public.driver_locations
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
