FROM node:18-alpine

# Instalar dependências essenciais
RUN apk add --no-cache \
    git \
    curl \
    bash \
    zsh \
    shadow \
    sudo \
    vim \
    nano

# Instalar Oh My ZSH
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Configurar ZSH como shell padrão (método compatível com Alpine)
RUN sed -i -e "s/bin\/ash/bin\/zsh/" /etc/passwd

# Criar diretório da aplicação
WORKDIR /app

# Instalar Quasar CLI globalmente
RUN npm install -g @quasar/cli

# Personalizar ZSH para desenvolvimento frontend
RUN echo 'echo "Bem-vindo ao ambiente de desenvolvimento VBuz Frontend!"' >> /root/.zshrc
RUN echo 'echo "Quasar CLI está disponível globalmente."' >> /root/.zshrc

# Criar script de inicialização
COPY start-frontend.sh /start-frontend.sh
RUN chmod +x /start-frontend.sh

# Definir diretório de trabalho
VOLUME ["/app"]

# Expor porta para desenvolvimento
EXPOSE 9000

# Comando padrão para iniciar o servidor e aplicação
ENTRYPOINT ["/start-frontend.sh"]