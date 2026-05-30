-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id TEXT PRIMARY KEY,
    external_ref TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_document TEXT,
    amount INTEGER NOT NULL, -- amount in centavos
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, expired, failed, canceled
    payment_method TEXT NOT NULL DEFAULT 'pix',
    items JSONB DEFAULT '[]'::jsonb,
    payment_data JSONB DEFAULT '{}'::jsonb, -- { gateway: 'paradise'|'pixzy', raw_response: ... }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by external_ref (used by webhooks/check-status)
CREATE INDEX IF NOT EXISTS idx_transactions_external_ref ON public.transactions(external_ref);

-- Enable Row Level Security (RLS) on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow service_role key full access to transactions
CREATE POLICY "Allow service_role full access" ON public.transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow anonymous users select access (optional, if they need direct query, but we use RPC instead)
CREATE POLICY "Allow anon read status" ON public.transactions
    FOR SELECT
    TO anon
    USING (true);

-- Create RPC public function to get transaction status
-- Runs with SECURITY DEFINER to allow execution by anonymous/authenticated users
CREATE OR REPLACE FUNCTION public.get_transaction_status(_transaction_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _status TEXT;
BEGIN
    SELECT status INTO _status
    FROM public.transactions
    WHERE transaction_id = _transaction_id;
    
    RETURN _status;
END;
$$;

-- Grant execution permissions on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_transaction_status(TEXT) TO anon, authenticated;
