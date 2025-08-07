import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('🚀 send-email function called')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request body
    const requestBody = await req.json()
    console.log('📥 Request body:', requestBody)

    const { to, subject, html, type = 'direct' } = requestBody

    // Validation
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields:', { to: !!to, subject: !!subject, html: !!html })
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios ausentes', 
          details: 'Email destinatário, assunto e conteúdo são obrigatórios' 
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
          details: 'Formato do email destinatário é inválido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      console.error('❌ SendGrid API key not configured')
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

    console.log('🔑 SendGrid API key found:', sendgridApiKey.substring(0, 10) + '...')

    // Use verified SendGrid sender email (sandbox mode compatible)
    const fromEmail = 'test@example.com'  // SendGrid sandbox email - always works
    
    // Prepare SendGrid payload
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ 
            email: to,
            name: to.split('@')[0] // Use email prefix as name
          }],
          subject: subject
        }
      ],
      from: {
        email: fromEmail,
        name: 'Sistema de Emails'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      },
      mail_settings: {
        sandbox_mode: {
          enable: false  // Disable sandbox for production
        }
      }
    }

    console.log('📨 SendGrid payload prepared:', {
      from: fromEmail,
      to: to,
      subject: subject,
      contentLength: html.length
    })

    // Send email via SendGrid
    console.log('📡 Sending to SendGrid API...')
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
      console.error('❌ SendGrid Error Details:', {
        status: sendgridResponse.status,
        statusText: sendgridResponse.statusText,
        body: errorText
      })

      // Parse SendGrid error for better user message
      let userMessage = 'Erro no serviço de email'
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.errors && errorData.errors.length > 0) {
          const firstError = errorData.errors[0]
          if (firstError.message) {
            userMessage = firstError.message
          }
        }
      } catch (e) {
        console.error('Failed to parse SendGrid error:', e)
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Falha no envio do email',
          details: userMessage,
          sendgridError: errorText,
          status: sendgridResponse.status
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid message ID from response headers
    const messageId = sendgridResponse.headers.get('x-message-id') || 'unknown'
    console.log('✅ Email sent successfully, Message ID:', messageId)

    // Log the email in Supabase (optional, don't fail if this fails)
    try {
      const { error: logError } = await supabaseClient
        .from('email_logs')
        .insert({
          user_id: null, // No user authentication required
          to_email: to,
          subject: subject,
          html_content: html,
          status: 'sent',
          sendgrid_message_id: messageId,
          type: type,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.error('⚠️ Failed to log email (non-critical):', logError)
      } else {
        console.log('✅ Email logged successfully')
      }
    } catch (logException) {
      console.error('⚠️ Exception logging email (non-critical):', logException)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email enviado com sucesso!',
        messageId: messageId,
        to: to,
        subject: subject
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Critical error in send-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message || 'Erro desconhecido no envio de email',
        stack: error.stack || 'No stack trace available'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})