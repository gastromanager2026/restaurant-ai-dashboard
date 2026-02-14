import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kebrjkzxyshxdfeenjke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYnJqa3p4eXNoeGRmZWVuamtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzg5NDAsImV4cCI6MjA3OTkxNDk0MH0.dG_VW1dNIFdN_7Y0NKcQP3-uyzoV_mVhRiQDt39hIc4';

export const supabase = createClient(supabaseUrl, supabaseKey);