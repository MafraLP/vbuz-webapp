<!-- src/pages/auth/LoginPage.vue -->
<template>
  <q-page class="flex flex-center">
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-sm-8 col-md-6 col-lg-4">
        <q-card flat bordered class="login-card">
          <q-card-section class="text-center">
            <div class="text-h4 text-primary q-mb-lg">vBuz</div>
            <div class="text-h6 q-mb-md">Gestão de Transporte Municipal</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="onSubmit" class="q-gutter-md">
              <q-input
                  v-model="email"
                  type="email"
                  label="E-mail"
                  filled
                  lazy-rules
                  :rules="[
                  val => !!val || 'Digite seu e-mail',
                  val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'E-mail inválido'
                ]"
              />

              <q-input
                  v-model="password"
                  :type="isPwd ? 'password' : 'text'"
                  label="Senha"
                  filled
                  lazy-rules
                  :rules="[val => !!val || 'Digite sua senha']"
              >
                <template v-slot:append>
                  <q-icon
                      :name="isPwd ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="isPwd = !isPwd"
                  />
                </template>
              </q-input>

              <div>
                <q-btn
                    label="Entrar"
                    type="submit"
                    color="primary"
                    class="full-width"
                    :loading="loading"
                />
              </div>
            </q-form>
          </q-card-section>

          <q-card-section class="text-center q-mt-md">
            <p class="text-grey-7">
              Baixe nosso aplicativo móvel para passageiros
            </p>
            <div class="row justify-center q-mt-sm">
              <q-btn flat type="a" href="#" target="_blank" class="store-btn">
                <q-img src="~assets/app-store.png" width="120px" />
              </q-btn>
              <q-btn flat type="a" href="#" target="_blank" class="store-btn">
                <q-img src="~assets/play-store.png" width="120px" />
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { useAuthStore } from 'src/stores/auth'

export default {
  name: 'LoginPage',

  data() {
    return {
      email: '',
      password: '',
      isPwd: true,
      loading: false
    }
  },

  methods: {

    async onSubmit() {
      if(this.email ==='test@gmail.com' && this.password === '123456') {
        this.$router.push('/dashboard')
      } else {
        this.$q.notify({
          color: 'negative',
          position: 'top',
          message: 'E-mail ou senha inválidos',
          icon: 'report_problem'
        })
      }
      this.loading = true

      try {
        const authStore = useAuthStore()
        await authStore.login({
          email: this.email,
          password: this.password
        })

        this.$router.push('/dashboard')
      } catch (error) {
        this.$q.notify({
          color: 'negative',
          position: 'top',
          message: error.response?.data?.message || 'Erro ao fazer login',
          icon: 'report_problem'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-card {
  padding: 20px;
  margin: 40px 10px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
}

.store-btn {
  padding: 5px;
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }
}
</style>
