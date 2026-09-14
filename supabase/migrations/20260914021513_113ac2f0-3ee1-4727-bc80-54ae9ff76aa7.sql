ALTER TABLE public.dragon_stock_movements
ADD COLUMN IF NOT EXISTS is_system_hidden boolean NOT NULL DEFAULT false;

UPDATE public.dragon_stock_movements
SET is_system_hidden = true
WHERE id IN (
  '70259433-9936-49f1-852c-a369d0fb78ed',
  'e32cfb66-cd34-4da0-a064-bece6f7e4195',
  'df55dd7e-58e9-4c8c-86c5-87b567fb5cd7',
  'acb41ecc-befc-4fac-a775-30f735103c93'
)
AND company_id = '77ec9a3d-602e-438f-97bf-1c69abd8f691';