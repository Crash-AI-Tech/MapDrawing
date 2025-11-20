<template>
  <div class="w-full p-6">
    <h2 v-if="session" class="text-xl font-bold text-center mb-6 text-gray-800">Welcome {{ session.user.user_metadata?.user_name || session.user.email }}</h2>
    <template v-else>
      <div class="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button 
          type="button" 
          class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
          :class="mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="switchMode('login')"
        >
          Login
        </button>
        <button 
          type="button" 
          class="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
          :class="mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="switchMode('register')"
        >
          Register
        </button>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'">
          <input
            v-model.trim="username"
            type="text"
            placeholder="Username"
            required
            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        
        <input 
          v-model.trim="email" 
          type="email" 
          placeholder="Email" 
          autocomplete="email" 
          required 
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        
        <input
          v-model="password"
          type="password"
          placeholder="Password (min 6 chars)"
          autocomplete="current-password"
          minlength="6"
          required
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        
        <input
          v-if="mode === 'register'"
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          autocomplete="new-password"
          minlength="6"
          required
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        
        <button 
          type="submit" 
          :disabled="busy"
          class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {{ busy ? 'Processing...' : (mode === 'login' ? 'Login' : 'Register') }}
        </button>
      </form>
    </template>

    <p v-if="info" class="mt-4 text-sm text-center text-green-600 bg-green-50 p-3 rounded-lg">{{ info }}</p>
    <p v-if="error" class="mt-4 text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">{{ error }}</p>
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
const username = ref('')
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
  username.value = ''
}

async function handleSubmit() {
  busy.value = true
  error.value = ''
  info.value = ''

  try {
    if (mode.value === 'register') {
      if (password.value !== confirmPassword.value) {
        throw new Error('Passwords do not match')
      }
      if (!username.value) {
        throw new Error('Username is required')
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            user_name: username.value
          }
        }
      })

      if (signUpError) throw signUpError

      info.value = 'Registration successful! Please check your email to confirm.'
      resetForm()
      mode.value = 'login'
      return
    }

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (signInError) {
      console.error('Login error:', signInError)
      if (signInError.message?.includes('Email not confirmed')) {
        throw new Error('Email not confirmed. Please check your inbox.')
      }
      throw signInError
    }

    console.log('Login successful, session:', data.session)

    if (data.session) {
      emit('authenticated', data.session)
      resetForm()
      info.value = 'Login successful.'
    } else {
      console.warn('Login succeeded but no session returned')
      throw new Error('Login failed: No session returned')
    }
  } catch (err) {
    console.error('Auth error caught:', err)
    error.value = err.message ?? 'Operation failed'
    if (!error.value) error.value = 'Unknown error'
  } finally {
    busy.value = false
  }
}
</script>
