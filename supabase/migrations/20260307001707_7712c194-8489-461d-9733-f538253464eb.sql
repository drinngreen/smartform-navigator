CREATE POLICY "All authenticated can read fir_form_templates"
ON public.fir_form_templates
FOR SELECT
TO authenticated
USING (true);