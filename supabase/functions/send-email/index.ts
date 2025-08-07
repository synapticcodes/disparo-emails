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
    
    // Parse body
    let body = null
    try {
      body = await req.json()
      console.log('📄 Body received:', body)
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

    // Basic validation
    if (!to || !subject || !html) {
      console.error('❌ Missing fields:', { to: !!to, subject: !!subject, html: !!html })
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

    // Get SendGrid API key
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      console.error('❌ SendGrid API key not found')
      return new Response(
        JSON.stringify({ 
          error: 'SendGrid não configurado',
          details: 'API key não encontrada'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔑 SendGrid API key found, length:', sendgridApiKey.length)

    // Prepare SendGrid payload - versão mais simples possível
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: 'test@example.com',
        name: 'Sistema de Emails'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    }

    console.log('📨 Sending to SendGrid:', {
      to: to,
      subject: subject,
      from: 'test@example.com',
      apiKeyLength: sendgridApiKey.length
    })

    // Send to SendGrid
    try {
      const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendgridPayload)
      })

      console.log('📬 SendGrid response status:', sendgridResponse.status)
      console.log('📬 SendGrid response headers:', Object.fromEntries(sendgridResponse.headers.entries()))

      if (!sendgridResponse.ok) {
        const errorText = await sendgridResponse.text()
        console.error('❌ SendGrid error:', {
          status: sendgridResponse.status,
          statusText: sendgridResponse.statusText,
          body: errorText
        })

        return new Response(
          JSON.stringify({ 
            error: 'Erro no SendGrid',
            details: `Status ${sendgridResponse.status}: ${sendgridResponse.statusText}`,
            sendgridError: errorText
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Success
      const responseBody = await sendgridResponse.text()
      const messageId = sendgridResponse.headers.get('x-message-id') || 'unknown'
      
      console.log('✅ Email sent successfully!')
      console.log('✅ Message ID:', messageId)
      console.log('✅ SendGrid response body:', responseBody)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email enviado com sucesso para ${to}!`,
          messageId: messageId,
          timestamp: new Date().toISOString(),
          sendgridStatus: sendgridResponse.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (sendgridError) {
      console.error('💥 SendGrid fetch error:', sendgridError)
      return new Response(
        JSON.stringify({ 
          error: 'Falha na conexão com SendGrid',
          details: sendgridError.message,
          errorType: sendgridError.name
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('💥 Critical error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno da função',
        details: error.message,
        errorType: error.name,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})