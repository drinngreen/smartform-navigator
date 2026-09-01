UPDATE public.rentri_registro_esiti SET numero_fir = NULL WHERE numero_fir = '';
UPDATE public.registro_generale SET registro = 'MULTY_IMPIANTO'
 WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND registro IS NULL;
DELETE FROM public.registro_generale
 WHERE tenant_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691' AND data_movimento >= '2026-07-01';