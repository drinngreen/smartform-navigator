-- Create a read-only SQL execution function for Dark Lemon AI
CREATE OR REPLACE FUNCTION public.exec_sql_readonly(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  upper_query text;
BEGIN
  upper_query := upper(trim(query));
  
  -- Only allow SELECT statements
  IF NOT (upper_query LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'Solo query SELECT sono permesse';
  END IF;
  
  -- Block dangerous patterns
  IF upper_query LIKE '%DROP%' OR upper_query LIKE '%ALTER%' OR upper_query LIKE '%TRUNCATE%' 
     OR upper_query LIKE '%CREATE%' OR upper_query LIKE '%GRANT%' OR upper_query LIKE '%REVOKE%' THEN
    RAISE EXCEPTION 'Query non permessa per motivi di sicurezza';
  END IF;
  
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Create a write SQL execution function for Dark Lemon AI
CREATE OR REPLACE FUNCTION public.exec_sql_write(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  upper_query text;
  affected_rows integer;
BEGIN
  upper_query := upper(trim(query));
  
  -- Block dangerous patterns
  IF upper_query LIKE '%DROP%' OR upper_query LIKE '%ALTER%' OR upper_query LIKE '%TRUNCATE%' 
     OR upper_query LIKE '%CREATE%' OR upper_query LIKE '%GRANT%' OR upper_query LIKE '%REVOKE%' THEN
    RAISE EXCEPTION 'Query non permessa per motivi di sicurezza';
  END IF;
  
  -- Only allow INSERT, UPDATE, DELETE
  IF NOT (upper_query LIKE 'INSERT%' OR upper_query LIKE 'UPDATE%' OR upper_query LIKE 'DELETE%') THEN
    RAISE EXCEPTION 'Solo INSERT, UPDATE, DELETE sono permessi';
  END IF;
  
  -- If query has RETURNING, get the result
  IF upper_query LIKE '%RETURNING%' THEN
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  ELSE
    EXECUTE query;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN jsonb_build_object('affected_rows', affected_rows);
  END IF;
END;
$$;