<!-- src/pages/auth/LoginPage.vue -->
<template>
  <q-page class="flex flex-center login-bg">
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
        <q-card flat bordered class="login-card">
          <!-- Header com logo e título -->
          <q-card-section class="text-center header-section">
            <div class="logo-container q-mb-lg">
              <div class="logo-circle">
                <q-icon name="directions_bus" size="48px" color="white" />
              </div>
            </div>
            <div class="text-h4 text-primary q-mb-sm brand-title">vBuz</div>
            <div class="text-subtitle1 text-grey-7 subtitle">
              Gestão de Transporte Municipal
            </div>
          </q-card-section>

          <!-- Formulário de login -->
          <q-card-section class="form-section">
            <q-form @submit="onSubmit" class="q-gutter-md">
              <q-input
                v-model="email"
                type="email"
                label="E-mail"
                filled
                lazy-rules
                class="custom-input"
                :rules="[
                  val => !!val || 'Digite seu e-mail',
                  val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'E-mail inválido'
                ]"
              >
                <template v-slot:prepend>
                  <q-icon name="email" color="primary" />
                </template>
              </q-input>

              <q-input
                v-model="password"
                :type="isPwd ? 'password' : 'text'"
                label="Senha"
                filled
                lazy-rules
                class="custom-input"
                :rules="[val => !!val || 'Digite sua senha']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="primary" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="isPwd ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    color="grey-6"
                    @click="isPwd = !isPwd"
                  />
                </template>
              </q-input>

              <div class="q-mt-lg">
                <q-btn
                  label="Entrar"
                  type="submit"
                  color="primary"
                  class="full-width login-btn"
                  :loading="isSubmitting"
                  size="lg"
                  no-caps
                />
              </div>
            </q-form>
          </q-card-section>

          <!-- Divider -->
          <q-separator class="q-mx-lg" />

          <!-- App Store buttons -->
          <q-card-section class="text-center app-section">
            <p class="text-grey-7 app-text">
              <q-icon name="smartphone" class="q-mr-xs" />
              Baixe nosso aplicativo móvel para passageiros
            </p>
            <div class="row justify-center q-mt-md q-gutter-sm">
              <q-btn
                flat
                type="a"
                href="#"
                target="_blank"
                class="store-btn"
                no-caps
              >
                <q-img src="~assets/app-store.png" width="120px" class="store-img" />
              </q-btn>
              <q-btn
                flat
                type="a"
                href="#"
                target="_blank"
                class="store-btn"
                no-caps
              >
                <q-img src="~assets/play-store.png" width="120px" class="store-img" />
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { useAuth } from 'src/composables/useAuth'

export default {
  name: 'LoginPage',

  setup() {
    const { login, isLoading } = useAuth()

    return {
      authLogin: login,
      authLoading: isLoading
    }
  },

  data() {
    return {
      email: '',
      password: '',
      isPwd: true,
      loading: false
    }
  },

  computed: {
    // Combinar loading local com loading do auth
    isSubmitting() {
      return this.loading || this.authLoading
    }
  },

  methods: {
    async onSubmit() {
      this.loading = true

      try {
        await this.authLogin({
          email: this.email,
          password: this.password
        })
        // O redirecionamento já é feito automaticamente pelo composable
      } catch (error) {
        // As notificações também já são tratadas pelo composable
        console.error('Erro no login:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .login-bg {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-secondary) 100%);
  min-height: 100vh;
}

  .login-card {
  padding: 0;
  margin: 20px 10px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  overflow: hidden;
  max-width: 400px;

  // Dark mode adaptation
  .body--dark & {
  background: rgba(26, 26, 26, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
}

  .header-section {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-accent-1) 100%);
  color: white;
  padding: 32px 24px 24px;
  position: relative;

  &::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}
}

  .logo-container {
  display: flex;
  justify-content: center;
}

  .logo-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: transform 0.3s ease;

  &:hover {
  transform: scale(1.05);
}

  // Usar cor do ícone baseada no tema
  .q-icon {
  color: white;
}
}

  .brand-title {
  font-weight: 700;
  color: white !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 2.5rem;
}

  .subtitle {
  font-weight: 400;
  opacity: 0.9;
  color: white;
}

  .form-section {
  padding: 32px 24px;
  background: var(--q-secondary-background);

  .body--dark & {
  background: var(--q-secondary-background);
}
}

  .custom-input {
  .q-field__control {
  border-radius: 12px;
}

  .q-field__native {
  padding-left: 8px;
}

  // Cores dos ícones nos inputs
  .q-field__prepend .q-icon {
  color: var(--q-primary);
}

  .q-field__append .q-icon {
  color: var(--q-secondary-text);
}
}

  .login-btn {
  border-radius: 12px;
  font-weight: 600;
  padding: 12px 0;
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-accent-1) 100%) !important;
  transition: all 0.3s ease;

  &:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 99, 0, 0.4);
  background: linear-gradient(135deg, var(--q-accent-1) 0%, var(--q-secondary) 100%) !important;
}

  // Garantir que o texto seja sempre branco
  .q-btn__content {
  color: white !important;
}
}

  .app-section {
  padding: 24px;
  background: var(--q-primary-background);

  .body--dark & {
  background: var(--q-primary-background);
}
}

  .app-text {
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: var(--q-secondary-text);

  .q-icon {
  color: var(--q-accent-3);
}
}

  .store-btn {
  padding: 8px;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.8);

  .body--dark & {
  background: rgba(0, 0, 0, 0.3);
}
}
}

  .store-img {
  border-radius: 8px;
  transition: transform 0.3s ease;

  .store-btn:hover & {
  transform: scale(1.05);
}
}

  // Separador com cor do tema
  .q-separator {
  background: var(--q-accent-4);
  opacity: 0.3;
}

  // Responsividade
  @media (max-width: 480px) {
  .login-card {
  margin: 10px 5px;
  border-radius: 12px;
}

  .header-section {
  padding: 24px 20px 20px;
}

  .form-section {
  padding: 24px 20px;
}

  .logo-circle {
  width: 70px;
  height: 70px;
}

  .brand-title {
  font-size: 2rem;
}

  .store-img {
  width: 100px !important;
}
}

  // Animações melhoradas
  @keyframes fadeInUp {
  from {
  opacity: 0;
  transform: translateY(20px);
}
  to {
  opacity: 1;
  transform: translateY(0);
}
}

  @keyframes gradientShift {
  0% {
    background-position: 0% 50%;
}
  50% {
  background-position: 100% 50%;
}
  100% {
  background-position: 0% 50%;
}
}

  .login-card {
  animation: fadeInUp 0.6s ease-out;
}

  // Animação sutil no background
  .login-bg {
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

  // Estados de foco nos inputs
  .custom-input {
  .q-field--focused {
  .q-field__control {
  box-shadow: 0 0 0 2px rgba(255, 99, 0, 0.2);
}
}
}

  // Melhorar contraste no modo escuro
  .body--dark {
  .login-bg {
  // Manter o mesmo gradiente mas com opacidade reduzida para modo escuro
  background: linear-gradient(135deg,
  rgba(255, 99, 0, 0.8) 0%,
  rgba(255, 161, 0, 0.8) 100%
  ),
  var(--q-primary-background);
}

  .brand-title,
  .subtitle {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}
}

  // Efeitos de hover mais suaves
  .logo-circle,
  .login-btn,
  .store-btn {
  &:hover {
  filter: brightness(1.05);
}
}

  // Customização específica para o tema vBuz
  .vbuz-theme {
  .login-btn {
  // Gradiente específico para o botão no tema vBuz
  background: linear-gradient(135deg,
  var(--q-orange-pantone) 0%,
  var(--q-orange-peel) 50%,
  var(--q-school-bus-yellow) 100%
  ) !important;

  &:hover {
  background: linear-gradient(135deg,
  var(--q-accent-1) 0%,
  var(--q-accent-3) 100%
  ) !important;
}
}

  .header-section {
  background: linear-gradient(135deg,
  var(--q-orange-pantone) 0%,
  var(--q-accent-1) 100%
  );
}
}
</style>
