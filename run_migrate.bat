@echo off
set PYTHONPATH=backend
set SUPABASE_URL=https://luqgcacxkcrmhsdopjyl.supabase.co
set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cWdjYWN4a2NybWhzZG9wanlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU5NTQ5NywiZXhwIjoyMTA5MTcxNDk3fQ.YZ4-Nw_zJERkhddT1_nOSww1Wit_-SJMCLOpxJG2hKA
set SUPABASE_BUCKET=media
set S3_REGION=eu-west-1
set S3_PUBLIC_URL=https://luqgcacxkcrmhsdopjyl.supabase.co/storage/v1/object/public/media
set DATABASE_URL=postgresql+psycopg2://postgres.luqgcacxkcrmhsdopjyl:nRgDEztMJIXI3zzc@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
python backend/scripts/migrate_media_to_s3.py > backend/migrate.log 2> backend/migrate.err
