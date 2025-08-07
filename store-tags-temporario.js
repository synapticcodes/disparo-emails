#!/usr/bin/env node

/**
 * SISTEMA TEMPORÁRIO: Armazenar tags de agendamentos
 * Até as colunas serem criadas, vamos usar uma abordagem alternativa
 */

// Sistema de armazenamento temporário em memória
const tagsArmazenadas = new Map();

// Função para salvar tags de um agendamento
function salvarTagsAgendamento(scheduleId, tags) {
  if (tags && Array.isArray(tags) && tags.length > 0) {
    tagsArmazenadas.set(scheduleId, tags);
    console.log(`📝 TEMP: Tags salvas para agendamento ${scheduleId}: ${tags.join(', ')}`);
  }
}

// Função para recuperar tags de um agendamento
function recuperarTagsAgendamento(scheduleId) {
  return tagsArmazenadas.get(scheduleId) || null;
}

// Função para limpar tags processadas
function limparTagsAgendamento(scheduleId) {
  const removed = tagsArmazenadas.delete(scheduleId);
  if (removed) {
    console.log(`🗑️ TEMP: Tags removidas para agendamento ${scheduleId}`);
  }
}

// Função para listar todos os agendamentos com tags
function listarTodosAgendamentosComTags() {
  const todos = [];
  tagsArmazenadas.forEach((tags, scheduleId) => {
    todos.push({ scheduleId, tags });
  });
  return todos;
}

module.exports = {
  salvarTagsAgendamento,
  recuperarTagsAgendamento,
  limparTagsAgendamento,
  listarTodosAgendamentosComTags
};

// Teste se executado diretamente
if (require.main === module) {
  console.log('🧪 === TESTE DO SISTEMA TEMPORÁRIO ===');
  
  // Simular uso
  salvarTagsAgendamento('123', ['teste', 'vip']);
  salvarTagsAgendamento('456', ['cliente']);
  
  console.log('Tags do 123:', recuperarTagsAgendamento('123'));
  console.log('Tags do 456:', recuperarTagsAgendamento('456'));
  console.log('Tags do 999:', recuperarTagsAgendamento('999')); // null
  
  console.log('Todos:', listarTodosAgendamentosComTags());
  
  limparTagsAgendamento('123');
  console.log('Após limpeza:', listarTodosAgendamentosComTags());
}