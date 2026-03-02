import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase
    .from("pipeline_deals")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching pipeline_deals:", error.message);
    if (error.message.includes('column "priority" does not exist')) {
      console.log('CONFIRMED: Column "priority" is missing.');
    }
  } else {
    console.log("Success! Data:", data);
    if (data.length > 0) {
      console.log("Columns found:", Object.keys(data[0]));
    } else {
      console.log("Table exists but is empty.");
    }
  }
}

test();
