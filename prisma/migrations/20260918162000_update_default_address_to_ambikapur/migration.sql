-- Update existing addresses to Ambikapur, Chhattisgarh
UPDATE "Address"
SET "streetArea" = 'Gandhi Chowk, Ambikapur, Chhattisgarh',
    "landmark" = 'Near Ghadi Chowk',
    "latitude" = 23.134343,
    "longitude" = 83.195082
WHERE "streetArea" ILIKE '%Connaught%'
   OR "streetArea" ILIKE '%Barakhamba%'
   OR "streetArea" ILIKE '%Main Market Road%'
   OR "streetArea" ILIKE '%Main Road%';
