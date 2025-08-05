const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupDadosComercial() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('📊 Criando dados de exemplo para comercial@meunomeok.com...\n');
  
  const userId = '2ce3ae60-3656-411d-81b6-50a4eb62d482'; // ID do usuário comercial
  
  try {
    // 1. Criar segmentos
    console.log('1️⃣ Criando segmentos...');
    const { data: segmentos, error: segmentosError } = await supabase
      .from('segmentos')
      .insert([
        {
          nome: 'Clientes VIP',
          descricao: 'Clientes premium com alto valor',
          criterios: { tipo: 'vip', valor_minimo: 1000 },
          user_id: userId
        },
        {
          nome: 'Prospectos',
          descricao: 'Leads interessados em nossos produtos',
          criterios: { tipo: 'prospect', origem: 'website' },
          user_id: userId
        }
      ])
      .select();
    
    if (segmentosError) {
      console.log('❌ Erro ao criar segmentos:', segmentosError.message);
      return;
    }
    
    console.log(`✅ ${segmentos.length} segmentos criados`);
    
    // 2. Criar contatos
    console.log('\n2️⃣ Criando contatos...');
    const { data: contatos, error: contatosError } = await supabase
      .from('contatos')
      .insert([
        {
          nome: 'João Silva',
          email: 'joao@empresa.com',
          segmento_id: segmentos[0].id,
          user_id: userId
        },
        {
          nome: 'Maria Santos',
          email: 'maria@corporacao.com',
          segmento_id: segmentos[0].id,
          user_id: userId
        },
        {
          nome: 'Pedro Costa',
          email: 'pedro@startup.com',
          segmento_id: segmentos[1].id,
          user_id: userId
        },
        {
          nome: 'Ana Lima',
          email: 'ana@negocio.com',
          segmento_id: segmentos[1].id,
          user_id: userId
        },
        {
          nome: 'Carlos Ferreira',
          email: 'carlos@comercio.com',
          segmento_id: segmentos[0].id,
          user_id: userId
        }
      ])
      .select();
    
    if (contatosError) {
      console.log('❌ Erro ao criar contatos:', contatosError.message);
      return;
    }
    
    console.log(`✅ ${contatos.length} contatos criados`);
    
    // 3. Criar templates
    console.log('\n3️⃣ Criando templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('templates')
      .insert([
        {
          nome: 'Boas-vindas',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">Bem-vindo, {{nome}}!</h1>
              <p>Obrigado por se cadastrar em nossa plataforma.</p>
              <p>Estamos animados para trabalhar com a {{empresa}}.</p>
              <p>Atenciosamente,<br>Equipe Comercial</p>
            </div>
          `,
          variaveis: { nome: 'Nome do cliente', empresa: 'Nome da empresa' },
          user_id: userId
        },
        {
          nome: 'Newsletter Mensal',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Newsletter - {{mes}}</h2>
              <p>Olá {{nome}},</p>
              <p>Confira as novidades deste mês:</p>
              <ul>
                <li>Novos produtos lançados</li>
                <li>Promoções especiais</li>
                <li>Dicas e tutoriais</li>
              </ul>
              <p>Visite nosso site para mais informações.</p>
            </div>
          `,
          variaveis: { nome: 'Nome do cliente', mes: 'Mês atual' },
          user_id: userId
        },
        {
          nome: 'Proposta Comercial',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Proposta para {{empresa}}</h2>
              <p>Prezado(a) {{nome}},</p>
              <p>Seguem os detalhes da nossa proposta comercial:</p>
              <div style="background: #f3f4f6; padding: 20px; margin: 20px 0;">
                <h3>Proposta: {{proposta}}</h3>
                <p>Valor: {{valor}}</p>
                <p>Prazo: {{prazo}}</p>
              </div>
              <p>Aguardamos seu retorno.</p>
            </div>
          `,
          variaveis: { 
            nome: 'Nome do cliente', 
            empresa: 'Nome da empresa',
            proposta: 'Descrição da proposta',
            valor: 'Valor da proposta',
            prazo: 'Prazo de entrega'
          },
          user_id: userId
        }
      ])
      .select();
    
    if (templatesError) {
      console.log('❌ Erro ao criar templates:', templatesError.message);
      return;
    }
    
    console.log(`✅ ${templates.length} templates criados`);
    
    // 4. Criar campanhas
    console.log('\n4️⃣ Criando campanhas...');
    const { data: campanhas, error: campanhasError } = await supabase
      .from('campanhas')
      .insert([
        {
          nome: 'Campanha Boas-vindas VIP',
          assunto: 'Bem-vindo ao nosso programa VIP!',
          template_html: templates[0].html,
          segmentos: [segmentos[0].id],
          remetente: 'comercial@meunomeok.com',
          status: 'rascunho',
          user_id: userId
        },
        {
          nome: 'Newsletter Janeiro 2025',
          assunto: 'Newsletter - Janeiro 2025',
          template_html: templates[1].html,
          segmentos: [segmentos[0].id, segmentos[1].id],
          remetente: 'comercial@meunomeok.com',
          status: 'enviada',
          estatisticas: {
            sent_successfully: 5,
            total_contacts: 5,
            sent_at: new Date().toISOString()
          },
          user_id: userId
        },
        {
          nome: 'Prospecção Q1 2025',
          assunto: 'Proposta especial para sua empresa',
          template_html: templates[2].html,
          segmentos: [segmentos[1].id],
          remetente: 'comercial@meunomeok.com',
          status: 'agendada',
          agendamento: new Date(Date.now() + 24*60*60*1000).toISOString(), // Amanhã
          user_id: userId
        }
      ])
      .select();
    
    if (campanhasError) {
      console.log('❌ Erro ao criar campanhas:', campanhasError.message);
      return;
    }
    
    console.log(`✅ ${campanhas.length} campanhas criadas`);
    
    // 5. Criar estatísticas de email
    console.log('\n5️⃣ Criando estatísticas de exemplo...');
    const { data: stats, error: statsError } = await supabase
      .from('email_statistics')
      .insert([
        {
          message_id: 'sg_msg_001',
          email: 'joao@empresa.com',
          event_type: 'delivered',
          campaign_id: campanhas[1].id,
          contact_id: contatos[0].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 2*60*60*1000).toISOString() // 2 horas atrás
        },
        {
          message_id: 'sg_msg_002',
          email: 'joao@empresa.com',
          event_type: 'open',
          campaign_id: campanhas[1].id,
          contact_id: contatos[0].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 1*60*60*1000).toISOString() // 1 hora atrás
        },
        {
          message_id: 'sg_msg_003',
          email: 'maria@corporacao.com',
          event_type: 'delivered',
          campaign_id: campanhas[1].id,
          contact_id: contatos[1].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 2*60*60*1000).toISOString()
        },
        {
          message_id: 'sg_msg_004',
          email: 'maria@corporacao.com',
          event_type: 'open',
          campaign_id: campanhas[1].id,
          contact_id: contatos[1].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 90*60*1000).toISOString() // 90 min atrás
        },
        {
          message_id: 'sg_msg_005',
          email: 'maria@corporacao.com',
          event_type: 'click',
          campaign_id: campanhas[1].id,
          contact_id: contatos[1].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 85*60*1000).toISOString() // 85 min atrás
        },
        {
          message_id: 'sg_msg_006',
          email: 'pedro@startup.com',
          event_type: 'delivered',
          campaign_id: campanhas[1].id,
          contact_id: contatos[2].id,
          user_id: userId,
          timestamp: new Date(Date.now() - 2*60*60*1000).toISOString()
        }
      ])
      .select();
    
    if (statsError) {
      console.log('❌ Erro ao criar estatísticas:', statsError.message);
      return;
    }
    
    console.log(`✅ ${stats.length} eventos de email criados`);
    
    // 6. Criar logs
    console.log('\n6️⃣ Criando logs de atividade...');
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .insert([
        {
          user_id: userId,
          action: 'envio_campanha',
          status: 'sucesso',
          details: { campaign_id: campanhas[1].id, sent: 5 },
          created_at: new Date(Date.now() - 3*60*60*1000).toISOString()
        },
        {
          user_id: userId,
          action: 'criar_template',
          status: 'sucesso',
          details: { template_id: templates[0].id, nome: 'Boas-vindas' },
          created_at: new Date(Date.now() - 4*60*60*1000).toISOString()
        },
        {
          user_id: userId,
          action: 'criar_contato',
          status: 'sucesso',
          details: { contact_id: contatos[0].id, nome: 'João Silva' },
          created_at: new Date(Date.now() - 5*60*60*1000).toISOString()
        }
      ])
      .select();
    
    if (logsError) {
      console.log('❌ Erro ao criar logs:', logsError.message);
      return;
    }
    
    console.log(`✅ ${logs.length} logs criados`);
    
    console.log('\n🎉 Dados de exemplo criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   👥 ${contatos.length} contatos`);
    console.log(`   📄 ${templates.length} templates`);
    console.log(`   📢 ${campanhas.length} campanhas`);
    console.log(`   🏷️  ${segmentos.length} segmentos`);
    console.log(`   📈 ${stats.length} eventos de email`);
    console.log(`   📝 ${logs.length} logs de atividade`);
    
    console.log('\n✅ Agora seu dashboard terá dados para exibir!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

setupDadosComercial();