-- Check what states have contracts in the database
SELECT DISTINCT state_code, COUNT(*) as contract_count 
FROM contract_files 
GROUP BY state_code 
ORDER BY state_code;

-- Check all contract records
SELECT id, state_code, county_fips, contract_name, status, version 
FROM contract_files 
ORDER BY state_code, contract_name;
