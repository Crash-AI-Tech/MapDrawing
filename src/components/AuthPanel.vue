<template>
  <div class="auth-panel">
    <h2 v-if="session" class="auth-title">欢迎 {{ session.user.email }}</h2>
    <template v-else>
      <div class="tabs">
        <button type="button" :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button>
        <button type="button" :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <input v-model.trim="email" type="email" placeholder="邮箱" autocomplete="email" required />
        <input
          v-model="password"
          type="password"
          placeholder="密码（至少 6 位）"
          autocomplete="current-password"
          minlength="6"
          required
        />
        <input
          v-if="mode === 'register'"
          v-model="confirmPassword"
          type="password"
          placeholder="确认密码"
          autocomplete="new-password"
          minlength="6"
          required
        />
        <button type="submit" :disabled="busy">
          {{ mode === 'login' ? '立即登录' : '发送验证邮件' }}
        </button>
      </form>
    </template>

    <p v-if="info" class="auth-hint">{{ info }}</p>
    <p v-if="error" class="auth-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../supabaseClient'

const props = defineProps({
  session: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['authenticated'])

const mode = ref('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')

watch(
  () => props.session,
  (value) => {
    if (value) {
      resetForm()
      info.value = ''
      error.value = ''
    }
  }
)

function switchMode(nextMode) {
  if (busy.value) return
  mode.value = nextMode
  resetForm()
  error.value = ''
  info.value = ''
}

function resetForm() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
}

async function handleSubmit() {
  busy.value = true
  error.value = ''
  info.value = ''

  try {
    if (mode.value === 'register') {
      if (password.value !== confirmPassword.value) {
        throw new Error('两次输入的密码不一致')
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (signUpError) throw signUpError

      info.value = '注册成功，请前往邮箱完成验证后再登录。'
      resetForm()
      mode.value = 'login'
      return
    }

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (signInError) {
      if (signInError.message?.includes('Email not confirmed')) {
        throw new Error('邮箱尚未验证，请先完成邮箱验证。')
      }
      throw signInError
    }

    if (data.session) {
      emit('authenticated')
      resetForm()
      info.value = '登录成功。'
    }
  } catch (err) {
    error.value = err.message ?? '操作失败'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.auth-panel {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(30, 41, 59, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-title {
  margin: 0;
  color: #1e293b;
}

.tabs {
  display: inline-flex;
  background: #e2e8f0;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tabs button {
  border: none;
  background: transparent;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: #475569;
}

.tabs button.active {
  background: #1d4ed8;
  color: #ffffff;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}

button[type='submit'] {
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  background: #2563eb;
  color: white;
  font-weight: 600;
}

button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.auth-error {
  color: #dc2626;
}

.auth-hint {
  color: #0f172a;
  font-size: 13px;
}
</style>
