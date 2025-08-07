import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Function called, method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Processing POST request')
    console.log('📋 Headers:', Object.fromEntries(req.headers.entries()))
    console.log('📋 URL:', req.url)
    
    // Try to parse body to see if there are issues
    let body = null
    try {
      body = await req.json()
      console.log('📄 Body parsed successfully:', body)
    } catch (bodyError) {
      console.error('❌ Failed to parse body:', bodyError.message)
    }
    
    // Just return success without doing anything complex
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Função funcionando!',
        timestamp: new Date().toISOString(),
        method: req.method
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})