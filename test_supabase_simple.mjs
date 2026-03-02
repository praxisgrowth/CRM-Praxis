
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xmfdrtrwpymgkvaeeyyq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZmRydHJ3cHltZ2t2YWVleXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzMTMsImV4cCI6MjA4NzgzMTMxM30.bVX9ZyM9gORFOrYNAXyzZWLY95vHAaGmXcszpHg8-8I'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing Supabase connection (no dotenv)...')
  const { data, error } = await supabase
    .from('pipeline_deals')
    .select('*')
    .limit(1)

  if (error) {
    console.log('RESULT_ERROR: ' + error.message)
  } else {
    console.log('RESULT_SUCCESS')
    if (data.length > 0) {
        console.log('COLUMNS: ' + Object.keys(data[0]).join(', '))
    } else {
        console.log('RESULT_EMPTY_TABLE')
    }
  }
}

test()
