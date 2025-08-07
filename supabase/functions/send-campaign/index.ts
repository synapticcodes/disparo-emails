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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { campaign_id } = await req.json()

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'Missing campaign_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ error: 'SendGrid API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campanhas')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get contacts for the campaign (assuming you have a way to get contacts)
    // For now, let's get all contacts for the user
    const { data: contacts, error: contactsError } = await supabaseClient
      .from('contatos')
      .select('email, nome')
      .eq('user_id', user.id)

    if (contactsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to get contacts' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No contacts found for campaign' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare personalizations for each contact
    const personalizations = contacts.map(contact => ({
      to: [{ email: contact.email }],
      substitutions: {
        '{{nome}}': contact.nome || 'Contato',
        '{{email}}': contact.email
      }
    }))

    // Prepare SendGrid payload for batch sending
    const sendgridPayload = {
      personalizations: personalizations.slice(0, 1000), // SendGrid limit
      from: {
        email: 'noreply@seudominio.com', // Configure com seu domínio
        name: 'Sistema de Emails'
      },
      subject: campaign.assunto,
      content: [
        {
          type: 'text/html',
          value: campaign.template_html
        }
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true }
      }
    }

    // Send campaign via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridPayload)
    })

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text()
      console.error('SendGrid Error:', errorText)
      
      // Mark campaign as failed
      await supabaseClient
        .from('campanhas')
        .update({ 
          status: 'erro',
          error_message: errorText,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign_id)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send campaign via SendGrid',
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get SendGrid message ID from response headers
    const messageId = sendgridResponse.headers.get('x-message-id')

    // Update campaign status
    const { error: updateError } = await supabaseClient
      .from('campanhas')
      .update({ 
        status: 'enviada',
        sent_at: new Date().toISOString(),
        sendgrid_message_id: messageId,
        total_sent: contacts.length
      })
      .eq('id', campaign_id)

    if (updateError) {
      console.error('Failed to update campaign:', updateError)
    }

    // Log individual emails
    const emailLogs = contacts.map(contact => ({
      user_id: user.id,
      campaign_id: campaign_id,
      to_email: contact.email,
      subject: campaign.assunto,
      html_content: campaign.template_html,
      status: 'sent',
      sendgrid_message_id: messageId,
      type: 'campaign',
      created_at: new Date().toISOString()
    }))

    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert(emailLogs)

    if (logError) {
      console.error('Failed to log emails:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign sent successfully',
        messageId: messageId,
        totalSent: contacts.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-campaign function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})