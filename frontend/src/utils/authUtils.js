// Utilitários de autenticação

export const clearAuthState = () => {
  // Limpar localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('supabase.auth.')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Limpar sessionStorage
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('supabase.auth.')) {
      sessionKeysToRemove.push(key);
    }
  }
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  console.log('Estado de autenticação limpo');
};

export const forceLogout = () => {
  clearAuthState();
  
  // Recarregar a página para garantir estado limpo
  window.location.href = '/login';
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return true;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const now = Date.now() / 1000;
    
    return payload.exp < now;
  } catch (error) {
    console.error('Erro ao verificar expiração do token:', error);
    return true;
  }
};

export const debugAuthState = async (supabase) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 Debug Auth State:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasToken: !!session?.access_token,
      userEmail: session?.user?.email,
      tokenExpired: session?.access_token ? isTokenExpired(session.access_token) : 'N/A',
      error: error?.message
    });
    
    return { session, error };
  } catch (err) {
    console.error('Erro no debug auth state:', err);
    return { session: null, error: err };
  }
};