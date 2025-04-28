FROM node:20-alpine

WORKDIR /app

# Instalar Quasar CLI globalmente
RUN npm i -g @quasar/cli

# Instalar git (necessário para o Quasar CLI)
RUN apk add --no-cache git

# Expor a porta para desenvolvimento
EXPOSE 9000

# Manter o container rodando
CMD ["tail", "-f", "/dev/null"]