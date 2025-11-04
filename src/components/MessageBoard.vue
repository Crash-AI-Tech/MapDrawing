<template>
  <div class="message-board">
    <div class="message-header">
      <h2>留言板</h2>
      <button v-if="session" class="refresh" @click="fetchMessages" :disabled="loading">
        刷新
      </button>
    </div>

    <p v-if="!session" class="hint">请先登录以查看和发布留言。</p>

    <div v-if="session" class="message-form">
      <textarea
        v-model="formContent"
        rows="3"
        placeholder="写点什么..."
        :disabled="loading"
      ></textarea>
      <div class="form-actions">
        <button @click="submitMessage" :disabled="loading || !formContent.trim()">
          {{ editingId ? '更新留言' : '发布留言' }}
        </button>
        <button v-if="editingId" class="secondary" @click="resetForm" :disabled="loading">
          取消编辑
        </button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="info" class="info">{{ info }}</p>

    <ul class="message-list" v-if="session">
      <li v-for="item in messages" :key="item.id" :class="{ mine: item.author_id === session.user.id }">
        <header>
          <span class="nickname">{{ authorLabel(item) }}</span>
          <time>{{ formatTime(item.created_at) }}</time>
        </header>
        <p class="content">{{ item.content }}</p>
        <footer v-if="item.author_id === session.user.id">
          <button class="link" @click="startEdit(item)">编辑</button>
          <button class="link danger" @click="removeMessage(item.id)">删除</button>
        </footer>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '../supabaseClient'

const props = defineProps({
  session: {
    type: Object,
    default: null
  }
})

const messages = ref([])
const loading = ref(false)
const formContent = ref('')
const editingId = ref(null)
const error = ref('')
const info = ref('')

const canInteract = computed(() => Boolean(props.session))

watch(
  () => props.session?.user?.id,
  (value) => {
    if (value) {
      fetchMessages()
    } else {
      messages.value = []
    }
  },
  { immediate: true }
)

async function fetchMessages() {
  if (!canInteract.value) return
  loading.value = true
  error.value = ''
  info.value = ''
  const { data, error: queryError } = await supabase
    .from('messages')
    .select('id, author_id, content, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (queryError) {
    error.value = queryError.message ?? '加载留言失败'
  } else {
    messages.value = data ?? []
  }
  loading.value = false
}

async function submitMessage() {
  if (!canInteract.value) return
  loading.value = true
  error.value = ''
  info.value = ''

  const action = editingId.value ? 'update' : 'create'

  if (action === 'create') {
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        content: formContent.value.trim()
      })
      .select('id, author_id, content, created_at, updated_at')
      .single()

    if (insertError) {
      error.value = insertError.message ?? '提交失败'
    } else {
      messages.value = [data, ...messages.value]
      info.value = '留言已发布'
      resetForm()
    }
  } else {
    const { data: updated, error: updateError } = await supabase
      .from('messages')
      .update({
        content: formContent.value.trim()
      })
      .eq('id', editingId.value)
      .select('id, author_id, content, created_at, updated_at')
      .single()

    if (updateError) {
      error.value = updateError.message ?? '提交失败'
    } else {
      messages.value = messages.value.map((item) => (item.id === updated.id ? updated : item))
      info.value = '留言已更新'
      resetForm()
    }
  }

  loading.value = false
}

function startEdit(item) {
  editingId.value = item.id
  formContent.value = item.content
}

function resetForm() {
  editingId.value = null
  formContent.value = ''
}

async function removeMessage(id) {
  if (!canInteract.value) return
  loading.value = true
  error.value = ''
  info.value = ''
  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)

  if (deleteError) {
    error.value = deleteError.message ?? '删除失败'
  } else {
    messages.value = messages.value.filter((item) => item.id !== id)
    info.value = '留言已删除'
    resetForm()
  }

  loading.value = false
}

function authorLabel(item) {
  if (item.author_id && item.author_id === props.session?.user?.id) {
    return '我'
  }
  if (item.author_id) {
    return `用户 ${item.author_id.slice(0, 6)}`
  }
  return '匿名用户'
}

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}
</script>

<style scoped>
.message-board {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(30, 41, 59, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-form textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

button.refresh,
.form-actions button {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  background: #2563eb;
  color: white;
  font-weight: 600;
}

button.refresh:disabled,
.form-actions button:disabled {
  background: #cbd5e1;
}

button.secondary {
  background: #e2e8f0;
  color: #1e293b;
}

.message-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.message-list li {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f8fafc;
}

.message-list li.mine {
  border-color: #2563eb;
  background: #eff6ff;
}

.message-list header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #475569;
}

.content {
  margin: 8px 0;
  white-space: pre-wrap;
  color: #1e293b;
}

footer {
  display: flex;
  gap: 12px;
}

button.link {
  background: transparent;
  border: none;
  color: #2563eb;
  padding: 0;
  font-weight: 600;
}

button.link.danger {
  color: #dc2626;
}

.error {
  color: #dc2626;
}

.info {
  color: #0ea5e9;
}

.hint {
  color: #64748b;
}
</style>
