import React from 'react';

function App() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Sistema Funcionando!</h1>
      <p>Deploy realizado com sucesso em: {new Date().toLocaleString('pt-BR')}</p>
      <p>Versão simplificada para teste de conectividade.</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8' }}>
        ✅ React carregou corretamente
      </div>
    </div>
  );
}

export default App;