
-- Allow admins to view all movements
CREATE POLICY "Admins can view all movements"
  ON public.movimenti_impianto
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert movements
CREATE POLICY "Admins can insert movements"
  ON public.movimenti_impianto
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete movements  
CREATE POLICY "Admins can delete movements"
  ON public.movimenti_impianto
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update movements
CREATE POLICY "Admins can update movements"
  ON public.movimenti_impianto
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
