-- Check if the contract_files table exists and see any existing records
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contract_files';

-- If the table exists, check what records are in it
SELECT count(*) as total_contracts FROM contract_files;

-- Check specific records for Maryland
SELECT state_code, county_fips, contract_name, path 
FROM contract_files 
WHERE state_code = 'MD' 
LIMIT 5;
