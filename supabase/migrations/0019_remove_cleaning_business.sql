-- Phoxta platform — 0019 remove the cleaning-services business (SparkleClean)
-- Reverts 0018: the storefront app (businesses/sparkleclean) and its marketplace
-- listing were removed. Drop the blueprint so it no longer appears in the catalog.
delete from blueprints where slug = 'sparkleclean';
