<template>
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2 items-center">
        
        <!-- Main Toolbar -->
        <div class="p-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex items-center gap-4">
            
            <!-- Tools (Left Side) -->
            <div class="flex items-center gap-1 pr-4 border-r border-gray-300/50">
                <button
                v-for="(icon, tool) in tools"
                :key="tool"
                @click="handleToolClick(tool)"
                class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
                :class="currentTool === tool ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'"
                :title="tool"
                >
                <svg xmlns="http://www.w3.org/2000/svg" :viewBox="icon.viewBox" fill="currentColor" class="w-6 h-6">
                    <path :d="icon.path" />
                </svg>
                </button>

                <div class="w-px h-6 bg-gray-300 mx-2"></div>

                <button
                    @click="handleUndo"
                    class="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                    :class="{ 'opacity-50 cursor-not-allowed': !user }"
                    title="Undo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                </button>
            </div>

            <!-- User Info, Opacity & Login/Logout (Right Side) -->
            <div class="flex items-center gap-3 relative">
                
                <!-- Opacity Toggle -->
                <button 
                    @click="$emit('update:isTransparent', !isTransparent)"
                    class="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 border"
                    :class="isTransparent ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'"
                    title="Toggle Art Opacity"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" :viewBox="opacityIcon.viewBox" fill="currentColor" class="w-5 h-5">
                        <path :d="opacityIcon.path" />
                    </svg>
                </button>

                <div class="w-px h-6 bg-gray-300"></div>

                <!-- Logged In State -->
                <template v-if="user">
                    <div class="relative">
                        <button 
                            @click="showDropdown = !showDropdown"
                            class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm uppercase shadow-md border border-white/20 hover:ring-2 hover:ring-offset-2 hover:ring-indigo-500 transition-all"
                            :title="displayName"
                        >
                            {{ avatarInitials }}
                        </button>

                        <!-- Dropdown Menu -->
                        <div v-if="showDropdown" class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden animate-fade-in origin-top-right">
                            <div class="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                <p class="text-sm font-semibold text-gray-900 truncate">{{ displayName }}</p>
                                <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
                            </div>
                            
                            <button @click="openEditName" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit Name
                            </button>
                            
                            <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </template>

                <!-- Guest State -->
                <template v-else>
                    <div class="text-sm font-medium text-gray-500">Guest</div>
                    <button 
                        @click="$emit('request-login')" 
                        class="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        Login
                    </button>
                </template>
            </div>
        </div>

        <!-- Secondary Toolbar (Color & Size) - Only show when drawing -->
        <div v-if="isDrawingTool" class="px-4 py-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 flex items-center gap-6 animate-fade-in-up">
             <!-- Size Slider (Only for Brush) -->
             <div v-if="currentTool === 'BRUSH'" class="flex items-center gap-3">
                <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Size</span>
                <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.1"
                    :value="brushSize" 
                    @input="$emit('update:brushSize', parseFloat($event.target.value))"
                    class="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                />
                <span class="text-xs font-mono font-medium text-gray-600 w-8 text-right">{{ brushSize }}</span>
                <div class="w-px h-6 bg-gray-300 mx-1"></div>
            </div>

            <!-- Colors -->
            <div class="flex items-center gap-2">
                <button
                v-for="color in colors"
                :key="color"
                @click="$emit('update:currentColor', color)"
                class="w-6 h-6 rounded-full transition-all duration-200 border border-gray-200 shadow-sm hover:scale-110"
                :class="currentColor === color ? 'scale-125 ring-2 ring-offset-2 ring-blue-500 z-10' : 'hover:shadow-md'"
                :style="{ backgroundColor: color }"
                :title="color"
                ></button>
            </div>
        </div>

        <!-- Edit Name Modal -->
        <Teleport to="body">
            <div v-if="showEditModal" class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showEditModal = false">
                <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">Edit Display Name</h3>
                    <input 
                        v-model="editingName" 
                        type="text" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
                        placeholder="Enter new name"
                        @keyup.enter="saveName"
                    />
                    <div class="flex justify-end gap-2">
                        <button @click="showEditModal = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                        <button @click="saveName" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {{ isSaving ? 'Saving...' : 'Save' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { supabase } from '../supabaseClient';
import { DrawingTool, DRAWING_COLORS, TOOL_ICONS, LOGOUT_ICON, OPACITY_ICON } from '../constants.js';

const props = defineProps({
  user: Object,
  session: Object,
  userProfile: Object,
  currentTool: String,
  currentColor: String,
  brushSize: Number,
  isTransparent: Boolean
});

const emit = defineEmits(['update:currentTool', 'update:currentColor', 'update:brushSize', 'update:isTransparent', 'undo', 'logout', 'request-login', 'profile-updated']);

// Dropdown & Edit State
const showDropdown = ref(false);
const showEditModal = ref(false);
const editingName = ref('');
const isSaving = ref(false);

// Computed Display Name
const displayName = computed(() => {
    // Prioritize profile table, then auth metadata, then email
    const name = props.userProfile?.user_name || 
           props.user?.user_metadata?.user_name || 
           props.user?.email?.split('@')[0] || 
           'User';
    return name;
});

const avatarInitials = computed(() => {
    const name = displayName.value;
    return name.substring(0, 2).toUpperCase();
});

const isDrawingTool = computed(() => {
    return props.currentTool === DrawingTool.BRUSH || 
           props.currentTool === DrawingTool.MARKER;
});

// Methods
const handleToolClick = (tool) => {
    if (!props.user && tool !== DrawingTool.HAND) {
        emit('request-login');
        return;
    }
    emit('update:currentTool', tool);
};

const handleUndo = () => {
    if (!props.user) {
        emit('request-login');
        return;
    }
    emit('undo');
};

const handleLogout = () => {
    showDropdown.value = false;
    emit('logout');
};

const openEditName = () => {
    editingName.value = displayName.value;
    showDropdown.value = false;
    showEditModal.value = true;
};

const saveName = async () => {
    if (!editingName.value.trim()) return;
    
    if (!props.user) {
        alert('You must be logged in to update your name.');
        return;
    }
    
    isSaving.value = true;
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 10000)
        );

        // 1. Update Auth Metadata (Best effort, non-blocking)
        // We don't await this one to block the UI, just let it run
        supabase.auth.updateUser({
            data: { user_name: editingName.value.trim() }
        }).then(({ error }) => {
            if (error) console.warn('Auth update background warning:', error);
        }).catch(err => console.warn('Auth update background error:', err));

        // 2. Update Profiles Table (Primary Source) - Try Client first, then Raw Fetch
        if (props.user) {
            try {
                const profileUpdatePromise = supabase
                    .from('profiles')
                    .upsert({ 
                        id: props.user.id, 
                        user_name: editingName.value.trim(),
                        updated_at: new Date()
                    });

                const { error: profileError } = await Promise.race([profileUpdatePromise, timeoutPromise]);
                if (profileError) throw profileError;
            } catch (clientErr) {
                console.warn('Client profile update failed, trying Raw Fetch...', clientErr);
                
                // Fallback: Raw Fetch
                const envUrl = import.meta.env.VITE_SUPABASE_URL;
                const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                
                // Use prop session token if available, otherwise try getSession (which might hang)
                let token = props.session?.access_token;
                if (!token) {
                     console.log('No session prop, trying getSession...');
                     token = (await supabase.auth.getSession()).data.session?.access_token;
                }

                if (!token) throw new Error('No access token for raw fetch');

                const rawResponse = await fetch(`${envUrl}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': envKey,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        id: props.user.id,
                        user_name: editingName.value.trim(),
                        updated_at: new Date().toISOString()
                    })
                });

                if (!rawResponse.ok) {
                    const errorText = await rawResponse.text();
                    if (errorText.includes('profiles_user_name_key')) {
                        throw new Error('Username already taken');
                    }
                    throw new Error(`HTTP ${rawResponse.status}: ${errorText}`);
                }
            }
        }
        
        emit('profile-updated'); // Notify App to refresh session & profile
        showEditModal.value = false;
    } catch (e) {
        console.error('Failed to update name:', e);
        let msg = e.message || 'Unknown error';
        if (msg.includes('profiles_user_name_key') || msg.includes('duplicate key value')) {
            msg = 'Username already taken';
        }
        alert('Failed to update name: ' + msg);
    } finally {
        isSaving.value = false;
    }
};

// Close dropdown when clicking outside (simple implementation)
// In a real app, use a click-outside directive
watch(showDropdown, (val) => {
    if (val) {
        setTimeout(() => {
            const close = () => {
                showDropdown.value = false;
                window.removeEventListener('click', close);
            };
            window.addEventListener('click', close);
        }, 0);
    }
});

const tools = TOOL_ICONS;
const colors = DRAWING_COLORS;
const logoutIcon = LOGOUT_ICON;
const opacityIcon = OPACITY_ICON;
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-out;
}
.animate-scale-in {
    animation: scaleIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
</style>