# Configuração do Firebase - Aplicativo Mobile

##  Passo a Passo para Configuração

### 1. Obter Configurações do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com)
2. Selecione o **mesmo projeto** usado no aplicativo web
3. Vá em **"Configurações do projeto"** > **"Geral"**
4. Na seção **"Seus aplicativos"**, clique em **"Adicionar aplicativo"** e selecione **"Web"**
5. Registre o aplicativo com um nome (ex: "Eventos ICM Mobile")
6. Copie as configurações do Firebase

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto e substitua pelos valores reais:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 3. Verificar Regras do Firestore

Certifique-se de que as regras do Firestore permitem acesso aos dados:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Eventos - leitura para usuários autenticados
    match /events/{eventId} {
      allow read: if request.auth != null;
    }
    
    // Inscrições - leitura/escrita para o próprio usuário
    match /registrations/{registrationId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role == 'admin');
    }
    
    // Usuários - leitura/escrita para o próprio usuário
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (userId == request.auth.uid || 
         request.auth.token.role == 'admin');
    }
    
    // Igrejas - leitura para usuários autenticados
    match /churches/{churchId} {
      allow read: if request.auth != null;
    }
  }
}
```

### 4. Executar o Aplicativo

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar o aplicativo
npm start
# ou
npx expo start
```

### 5. Testar Funcionalidades

-  Login/Registro de usuários
-  Visualização de eventos
-  Inscrição em eventos
-  Visualização de inscrições
-  Sincronização com sistema web

###  Executar no Dispositivo

1. Instale o app **Expo Go** no seu celular
2. Escaneie o QR code que aparece no terminal
3. O aplicativo será carregado no seu dispositivo

###  Troubleshooting

**Erro de configuração Firebase:**
- Verifique se todas as variáveis de ambiente estão corretas
- Confirme se o projeto Firebase está ativo
- Verifique se as regras do Firestore permitem acesso

**Erro de rede:**
- Verifique sua conexão com a internet
- Confirme se o Firebase está acessível

**Erro de autenticação:**
- Verifique se o Authentication está habilitado no Firebase
- Confirme se o método de login por email/senha está ativo
