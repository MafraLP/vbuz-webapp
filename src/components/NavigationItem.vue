<template>
  <q-item
    :to="item.to"
    :exact="item.exact !== false"
    clickable
    v-ripple
    :active="isActive"
    active-class="navigation-item--active"
    class="navigation-item"
  >
    <q-item-section avatar>
      <q-icon :name="item.icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ item.title }}</q-item-label>
      <q-item-label v-if="item.caption" caption>{{ item.caption }}</q-item-label>
    </q-item-section>

    <q-item-section v-if="badge" side>
      <q-badge
        :color="badgeColor"
        :label="badge"
        rounded
      />
    </q-item-section>

    <q-item-section v-else-if="item.children" side>
      <q-icon name="keyboard_arrow_right" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface NavigationItemProps {
  item: {
    title: string
    icon: string
    to?: string
    exact?: boolean
    caption?: string
    badge?: any
    children?: any[]
    roles?: string[]
  }
  currentRoute: string
}

const props = defineProps<NavigationItemProps>()

// Computed
const isActive = computed(() => {
  if (!props.item.to) return false

  if (props.item.exact !== false) {
    return props.currentRoute === props.item.to
  }

  return props.currentRoute.startsWith(props.item.to)
})

const badge = computed(() => {
  if (typeof props.item.badge === 'function') {
    return props.item.badge()
  }
  return props.item.badge
})

const badgeColor = computed(() => {
  if (!badge.value) return 'grey'

  const num = parseInt(badge.value.toString())
  if (num > 10) return 'negative'
  if (num > 5) return 'warning'
  if (num > 0) return 'positive'
  return 'grey'
})
</script>

<style lang="scss" scoped>
.navigation-item {
  border-radius: 0 25px 25px 0;
  margin-right: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  &--active {
    background-color: rgba(25, 118, 210, 0.1) !important;
    color: #1976d2;

    :deep(.q-item__section--avatar .q-icon) {
      color: #1976d2;
    }
  }
}

// Dark mode support
.body--dark {
  .navigation-item {
    &:hover {
      background-color: rgba(255, 255, 255, 0.08);
    }

    &--active {
      background-color: rgba(144, 202, 249, 0.16) !important;
      color: #90caf9;

      :deep(.q-item__section--avatar .q-icon) {
        color: #90caf9;
      }
    }
  }
}
</style>
