<template>
  <div class="layout">
    <header class="top-bar">
      <div class="brand">Supabase 留言板 Demo</div>
      <div class="user-actions" v-if="session">
        <span>{{ session.user.email }}</span>
        <button @click="signOut" :disabled="busyAction">退出登录</button>
        <button class="danger" @click="deleteAccount" :disabled="busyAction">删除账号</button>
      </div>
    </header>

    <main>
      <section id="home" class="section hero">
        <div class="hero-copy">
          <h1>使用 Supabase 的最小留言板</h1>
          <p>仅保留邮箱注册/登录与留言增删改查，专注于基础 CRUD 学习。</p>
        </div>
        <AuthPanel :session="session" @authenticated="refreshSession" />
      </section>

      <section id="messages" class="section">
        <MessageBoard :session="session" />
      </section>
    </main>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from './supabaseClient'

import AuthPanel from './components/AuthPanel.vue'
import MessageBoard from './components/MessageBoard.vue'

const session = ref(null)
const busyAction = ref(false)
let authSubscription = null

async function refreshSession() {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
}

async function signOut() {
  busyAction.value = true
  try {
    await supabase.auth.signOut()
    session.value = null
  } finally {
    busyAction.value = false
  }
}

async function deleteAccount() {
  if (!session.value?.user?.id) return
  const confirmed = window.confirm('确认要删除账号并清空全部留言吗？此操作不可恢复。')
  if (!confirmed) return

  busyAction.value = true
  try {
    const { error } = await supabase.rpc('delete_current_user')
    if (error) {
      alert(error.message ?? '删除账号失败，请稍后重试。')
    } else {
      alert('账号已删除。')
      await supabase.auth.signOut()
      session.value = null
    }
  } finally {
    busyAction.value = false
  }
}

onMounted(async () => {
  await refreshSession()
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async () => {
    await refreshSession()
  })
  authSubscription = subscription
})

onBeforeUnmount(() => {
  if (authSubscription) {
    authSubscription.unsubscribe()
  }
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f4ff 0%, #f8fafc 100%);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 250, 252, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(203, 213, 225, 0.6);
}

.brand {
  font-weight: 700;
  font-size: 20px;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1e293b;
}

.user-actions button {
  border: none;
  background: #1d4ed8;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.user-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-actions button.danger {
  background: #dc2626;
}

main {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: center;
}

.hero-copy h1 {
  font-size: 32px;
  margin-bottom: 12px;
}

.hero-copy p {
  color: #475569;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .top-bar {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .user-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
