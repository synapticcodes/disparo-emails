import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀🚀🚀 SEND-EMAIL FUNCTION STARTED 🚀🚀🚀')
  console.log('📋 Method:', req.method)
  console.log('📋 URL:', req.url)
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Processing POST request for EMAIL SENDING')
    
    // Parse body
    let body = null
    try {
      body = await req.json()
      console.log('📄 Body received and parsed:', JSON.stringify(body, null, 2))
    } catch (bodyError) {
      console.error('❌ Failed to parse body:', bodyError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: bodyError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { to, subject, html } = body
    console.log('📧 Email details extracted:', { to, subject: subject || 'NO SUBJECT', htmlLength: html?.length || 0 })

    // Basic validation
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes',
          details: `Faltam: ${!to ? 'email ' : ''}${!subject ? 'assunto ' : ''}${!html ? 'conteúdo' : ''}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to)
      return new Response(
        JSON.stringify({ 
          error: 'Email inválido',
          details: 'O formato do email destinatário está incorreto'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      console.error('❌❌❌ SendGrid API key not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'SendGrid não configurado',
          details: 'API key não encontrada no ambiente'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔑 SendGrid API key found, length:', sendgridApiKey.length)
    console.log('🔑 API key starts with:', sendgridApiKey.substring(0, 10) + '...')

    // Prepare SendGrid payload
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ 
            email: to,
            name: to.split('@')[0] 
          }],
          subject: subject
        }
      ],
      from: {
        email: 'avisos@lembretescredilly.com',
        name: 'Lembretes Credilly'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ],
      mail_settings: {
        sandbox_mode: {
          enable: false  // EMAILS REAIS
        }
      },
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      }
    }

    console.log('📨📨📨 SENDING TO SENDGRID API 📨📨📨')
    console.log('📨 Payload:', JSON.stringify(sendgridPayload, null, 2))

    // Send to SendGrid
    try {
      console.log('🌐 Making fetch request to SendGrid API...')
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendgridPayload)
      })

      console.log('📬📬📬 SENDGRID RESPONSE 📬📬📬')
      console.log('📬 Status:', sendgridResponse.status)
      console.log('📬 Status Text:', sendgridResponse.statusText)
      console.log('📬 Headers:', Object.fromEntries(sendgridResponse.headers.entries()))

      if (!sendgridResponse.ok) {
        const errorText = await sendgridResponse.text()
        console.error('❌❌❌ SENDGRID ERROR:', {
          status: sendgridResponse.status,
          statusText: sendgridResponse.statusText,
          body: errorText
        })

        return new Response(
          JSON.stringify({ 
            error: 'Erro no SendGrid',
            details: `Status ${sendgridResponse.status}: ${sendgridResponse.statusText}`,
            sendgridError: errorText,
            debugInfo: {
              apiKeyLength: sendgridApiKey.length,
              payloadSize: JSON.stringify(sendgridPayload).length
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Success
      const responseBody = await sendgridResponse.text()
      const messageId = sendgridResponse.headers.get('x-message-id') || 'no-message-id-found'
      
      console.log('✅✅✅ EMAIL SENT SUCCESSFULLY! ✅✅✅')
      console.log('✅ Message ID:', messageId)
      console.log('✅ SendGrid response body:', responseBody)
      console.log('✅ Final status:', sendgridResponse.status)

      // Log to Supabase (non-blocking)
      try {
        console.log('📝 Attempting to log email to database...')
        // We'll skip database logging for now to avoid complications
        console.log('📝 Skipping database logging for simplicity')
      } catch (logError) {
        console.error('⚠️ Failed to log email (non-critical):', logError.message)
      }

      console.log('🎉🎉🎉 RETURNING SUCCESS RESPONSE 🎉🎉🎉')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `📧 Email enviado com sucesso para ${to} via SendGrid!`,
          messageId: messageId,
          timestamp: new Date().toISOString(),
          sendgridStatus: sendgridResponse.status,
          from: 'avisos@lembretescredilly.com',
          debugInfo: {
            functionVersion: 'FINAL_DEFINITIVA',
            apiKeyFound: true,
            payloadSent: true
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (sendgridError) {
      console.error('💥💥💥 SENDGRID FETCH ERROR:', sendgridError)
      console.error('💥 Error name:', sendgridError.name)
      console.error('💥 Error message:', sendgridError.message)
      console.error('💥 Error stack:', sendgridError.stack)
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha na conexão com SendGrid',
          details: sendgridError.message,
          errorType: sendgridError.name,
          debugInfo: {
            apiKeyLength: sendgridApiKey?.length || 0,
            payloadPrepared: true
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('💥💥💥 CRITICAL ERROR IN FUNCTION:', error)
    console.error('💥 Error name:', error.name)
    console.error('💥 Error message:', error.message)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno da função',
        details: error.message,
        errorType: error.name,
        debugInfo: {
          functionVersion: 'FINAL_DEFINITIVA',
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})