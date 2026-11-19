#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI=postgresql://skipity:05d1Sh7OMufGg7D5EPW4cUFHIIVzF1Yw@dpg-dbviicu1egvs73acnspg-a.oregon-postgres.render.com/vazlr_db

# Execute each .sql file in the directory
for file in init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done
