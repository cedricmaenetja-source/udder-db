import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://efanuvwrpqhchdpsvfir.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmYW51dndycHFoY2hkcHN2ZmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNDg3NzcsImV4cCI6MjA1ODcyNDc3N30.sOJLp44d80VT8_HW-_ESx837sC2ygSo3Q5huXuQzse0";

export const supabase = createClient(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY
);

export async function getVendorById(id) {
  const { data, error } = await supabase
    .from('tblvendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data, error: null };
}

export async function getVendors() {
  const { data, error } = await supabase
    .from('tblvendors')
    .select('*')
    .order('name', {ascending: true});

  if (error) {
    return { data: null, error };
  }

  return { data: data, error: null };
}

export async function getFilters(ref){
  const { data, error } = await supabase
    .from('tblsearchfilters')
    .select('*')
    .eq('ref', ref)
    .maybeSingle();
  
  if (error) {
    return { data: null, error };
  }

  return { data: data, error: null };
}

export async function addVisitor(payload) {
    const { data, error } = await supabase
    .from('tbldbvisitors')
    .insert([{ 
        name: payload['name'], 
        email:  payload['email'], 
        company_name: payload['company_name'], 
        country: payload['country'],
        headcount: payload['headcount'],
        ip_address: payload['ip_address']
    }])
    .select()
    .single();

    if (error) {
        return { data: null, error };
    }

    return { data: data, error: null };
}