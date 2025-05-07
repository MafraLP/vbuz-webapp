<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Sistema de Itinerários
        </q-toolbar-title>

        <div>v0.1</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
          Menu de Navegação
        </q-item-label>

        <q-item
          to="/"
          exact
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            Dashboard
          </q-item-section>
        </q-item>

        <q-item
          to="/map"
          exact
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="map" />
          </q-item-section>
          <q-item-section>
            Planejador de Itinerários
          </q-item-section>
        </q-item>

        <q-item-label header>Gerenciamento</q-item-label>

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="directions_bus" />
          </q-item-section>
          <q-item-section>
            Linhas e Rotas
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="place" />
          </q-item-section>
          <q-item-section>
            Pontos de Parada
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="schedule" />
          </q-item-section>
          <q-item-section>
            Horários
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
