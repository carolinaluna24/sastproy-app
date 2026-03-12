-- Add AVALADO to system_state enum
ALTER TYPE public.system_state ADD VALUE IF NOT EXISTS 'AVALADO' AFTER 'RADICADA';