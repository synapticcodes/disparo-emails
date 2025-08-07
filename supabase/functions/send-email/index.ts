import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Initialize Supabase client for fetching contact data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Supabase configuration missing')
      return new Response(
        JSON.stringify({ 
          error: 'Configuração do banco de dados não encontrada',
          details: 'Configuração do Supabase não encontrada'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Process universal variables by fetching contact data
    let processedSubject = subject
    let processedHtml = html

    console.log('🔍 Looking for contact with email:', to)
    
    try {
      const { data: contact, error: contactError } = await supabase
        .from('contatos')
        .select('nome, email')
        .eq('email', to)
        .single()

      if (contactError) {
        console.log('ℹ️ Contact not found in database, using fallback values:', contactError.message)
        
        // Use fallback values for universal variables
        processedSubject = processedSubject.replace(/\{\{nome\}\}/g, 'Cliente')
        processedSubject = processedSubject.replace(/\{\{nome_completo\}\}/g, 'Cliente')
        processedSubject = processedSubject.replace(/\{\{email\}\}/g, to)
        
        processedHtml = processedHtml.replace(/\{\{nome\}\}/g, 'Cliente')
        processedHtml = processedHtml.replace(/\{\{nome_completo\}\}/g, 'Cliente')
        processedHtml = processedHtml.replace(/\{\{email\}\}/g, to)
      } else {
        console.log('✅ Contact found:', contact)
        
        // Extract first name from full name
        const firstName = contact.nome ? contact.nome.split(' ')[0] : 'Cliente'
        const fullName = contact.nome || 'Cliente'
        
        console.log('📝 Replacing variables:', {
          firstName,
          fullName,
          email: contact.email
        })
        
        // Replace universal variables with actual contact data
        processedSubject = processedSubject.replace(/\{\{nome\}\}/g, firstName)
        processedSubject = processedSubject.replace(/\{\{nome_completo\}\}/g, fullName)
        processedSubject = processedSubject.replace(/\{\{email\}\}/g, contact.email)
        
        processedHtml = processedHtml.replace(/\{\{nome\}\}/g, firstName)
        processedHtml = processedHtml.replace(/\{\{nome_completo\}\}/g, fullName)
        processedHtml = processedHtml.replace(/\{\{email\}\}/g, contact.email)
      }
    } catch (dbError) {
      console.error('⚠️ Database error when fetching contact:', dbError)
      
      // Use fallback values if database fails
      processedSubject = processedSubject.replace(/\{\{nome\}\}/g, 'Cliente')
      processedSubject = processedSubject.replace(/\{\{nome_completo\}\}/g, 'Cliente')
      processedSubject = processedSubject.replace(/\{\{email\}\}/g, to)
      
      processedHtml = processedHtml.replace(/\{\{nome\}\}/g, 'Cliente')
      processedHtml = processedHtml.replace(/\{\{nome_completo\}\}/g, 'Cliente')
      processedHtml = processedHtml.replace(/\{\{email\}\}/g, to)
    }

    console.log('🎯 Final processed content:', {
      subject: processedSubject,
      htmlLength: processedHtml.length
    })

    // Prepare SendGrid payload
    const sendgridPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: processedSubject
        }
      ],
      from: {
        email: 'avisos@lembretescredilly.com',
        name: 'Lembretes Credilly'
      },
      content: [
        {
          type: 'text/html',
          value: processedHtml
        }
      ],
      mail_settings: {
        sandbox_mode: {
          enable: false  // Emails reais serão enviados
        }
      }
    }

    console.log('📨 Sending to SendGrid:', {
      to: to,
      subject: processedSubject,
      from: 'avisos@lembretescredilly.com',
      apiKeyLength: sendgridApiKey.length,
      variablesProcessed: subject !== processedSubject || html !== processedHtml
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

        // Save error log to database
        try {
          const { error: logError } = await supabase
            .from('logs')
            .insert([{
              user_id: '00000000-0000-0000-0000-000000000000', // UUID padrão para Edge Function
              action: 'envio_direto',
              status: 'erro',
              details: {
                error_message: `SendGrid Error: ${sendgridResponse.statusText}`,
                error_code: sendgridResponse.status,
                recipients_list: to,
                subject: processedSubject,
                sendgrid_error: errorText,
                variables_processed: subject !== processedSubject || html !== processedHtml
              },
              ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
            }])
          
          if (logError) {
            console.error('⚠️ Failed to save error log:', logError)
          } else {
            console.log('✅ Error log saved to database')
          }
        } catch (logSaveError) {
          console.error('⚠️ Error saving error log:', logSaveError)
        }

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

      // Save success log to database
      try {
        const { error: logError } = await supabase
          .from('logs')
          .insert([{
            user_id: '00000000-0000-0000-0000-000000000000', // UUID padrão para Edge Function
            action: 'envio_direto',
            status: 'sucesso',
            details: {
              recipients_count: 1,
              recipients_list: to,
              subject: processedSubject,
              message_id: messageId,
              sendgrid_status: sendgridResponse.status,
              variables_processed: subject !== processedSubject || html !== processedHtml,
              has_html: true,
              template_vars_used: subject !== processedSubject || html !== processedHtml,
              sent_at: new Date().toISOString()
            },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
          }])
        
        if (logError) {
          console.error('⚠️ Failed to save success log:', logError)
        } else {
          console.log('✅ Success log saved to database')
        }
      } catch (logSaveError) {
        console.error('⚠️ Error saving log:', logSaveError)
      }

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
      
      // Save connection error log to database
      try {
        const { error: logError } = await supabase
          .from('logs')
          .insert([{
            user_id: '00000000-0000-0000-0000-000000000000', // UUID padrão para Edge Function
            action: 'envio_direto',
            status: 'erro',
            details: {
              error_message: `Conexão SendGrid falhou: ${sendgridError.message}`,
              error_type: sendgridError.name,
              recipients_list: to,
              subject: processedSubject,
              variables_processed: subject !== processedSubject || html !== processedHtml
            },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
          }])
        
        if (logError) {
          console.error('⚠️ Failed to save connection error log:', logError)
        } else {
          console.log('✅ Connection error log saved to database')
        }
      } catch (logSaveError) {
        console.error('⚠️ Error saving connection error log:', logSaveError)
      }
      
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
    
    // Try to save critical error log (if supabase client is available)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
        
        const { error: logError } = await supabase
          .from('logs')
          .insert([{
            user_id: '00000000-0000-0000-0000-000000000000', // UUID padrão para Edge Function
            action: 'envio_direto',
            status: 'erro',
            details: {
              error_message: `Erro crítico: ${error.message}`,
              error_type: error.name,
              stack_trace: error.stack,
              recipients_list: body?.to || 'unknown'
            },
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1'
          }])
        
        if (logError) {
          console.error('⚠️ Failed to save critical error log:', logError)
        } else {
          console.log('✅ Critical error log saved to database')
        }
      }
    } catch (logSaveError) {
      console.error('⚠️ Error saving critical error log:', logSaveError)
    }
    
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