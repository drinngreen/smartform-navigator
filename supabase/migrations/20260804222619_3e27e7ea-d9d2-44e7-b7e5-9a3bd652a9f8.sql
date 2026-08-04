CREATE POLICY "auth read cliente_cantieri" ON public.cliente_cantieri FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read cliente_targhe" ON public.cliente_targhe FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read cliente_autorizzazioni" ON public.cliente_autorizzazioni FOR SELECT TO authenticated USING (true);