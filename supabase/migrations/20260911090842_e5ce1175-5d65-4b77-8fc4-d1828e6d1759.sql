DELETE FROM public.registro_generale
WHERE data_movimento >= DATE '2026-08-07'
  AND registro IN ('MULTY_IMPIANTO','MULTY_CONTO_PROPRIO','NIYOL');