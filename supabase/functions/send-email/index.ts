import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 send-email function started')

    // Parse the request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('📥 Request body received:', requestBody)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { to, subject, html } = requestBody

    // Basic validation
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes', 
          details: `Faltam campos: ${!to ? 'email, ' : ''}${!subject ? 'assunto, ' : ''}${!html ? 'conteúdo' : ''}`.replace(/, $/, '')
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
      console.error('❌ SendGrid API key not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'Configuração inválida', 
          details: 'SendGrid API key não configurada no servidor' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔑 SendGrid API key found, length:', sendgridApiKey.length)

    // Test SendGrid API key first with a simple request
    console.log('🧪 Testing SendGrid API connection...')
    
    try {
      const testResponse = await fetch('https://api.sendgrid.com/v3/user/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        }
      })
      
      console.log('🧪 SendGrid test response status:', testResponse.status)
      
      if (!testResponse.ok) {
        const testError = await testResponse.text()
        console.error('❌ SendGrid API key test failed:', testError)
        return new Response(
          JSON.stringify({ 
            error: 'SendGrid API key inválida',
            details: 'A chave de API do SendGrid não está funcionando. Verifique se está configurada corretamente.',
            sendgridStatus: testResponse.status
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      console.log('✅ SendGrid API key is valid')
      
    } catch (testError) {
      console.error('❌ Failed to test SendGrid API:', testError)
      return new Response(
        JSON.stringify({ 
          error: 'Falha na conexão com SendGrid',
          details: 'Não foi possível conectar ao serviço de email. Tente novamente.',
          errorType: testError.name,
          errorMessage: testError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare SendGrid email payload
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: {
        email: 'test@example.com',  // SendGrid sandbox email
        name: 'Sistema de Emails'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    }

    console.log('📨 Sending email with payload:', {
      to: to,
      subject: subject,
      from: 'test@example.com',
      contentLength: html.length
    })

    // Send email via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridPayload)
    })

    console.log('📬 SendGrid response status:', sendgridResponse.status)

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text()
      console.error('❌ SendGrid send error:', {
        status: sendgridResponse.status,
        statusText: sendgridResponse.statusText,
        body: errorText
      })

      return new Response(
        JSON.stringify({ 
          error: 'Falha no envio do email',
          details: 'O serviço de email retornou um erro. Tente novamente em alguns minutos.',
          sendgridStatus: sendgridResponse.status,
          sendgridError: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Success
    const messageId = sendgridResponse.headers.get('x-message-id') || 'unknown'
    console.log('✅ Email sent successfully, Message ID:', messageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email enviado com sucesso para ${to}!`,
        messageId: messageId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Critical error in send-email function:', error)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message || 'Erro desconhecido no processamento do email',
        errorType: error.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})