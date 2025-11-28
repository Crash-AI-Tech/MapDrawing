<template>
  <div class="relative w-screen h-screen font-sans overflow-hidden">
    <!-- Map is always visible -->
    <MapCanvas
      ref="mapCanvasRef"
      :drawings="drawings"
      :tool="currentTool"
      :color="currentColor"
      :brush-size="brushSize"
      :user="userId"
      :user-email="userEmail"
      :is-transparent="isTransparent"
      @add-drawing="addDrawing"
      @remove-drawing="removeDrawing"
      @update-drawing="updateDrawing"
      @viewport-change="handleViewportChange"
    />
    
    <!-- Toolbar handles tool selection and login requests -->
    <Toolbar
      :user="user"
      :session="session"
      :user-profile="userProfile"
      :current-tool="currentTool"
      :current-color="currentColor"
      :brush-size="brushSize"
      :is-transparent="isTransparent"
      :is-loading="isLoadingDrawings"
      @update:currentTool="currentTool = $event"
      @update:currentColor="currentColor = $event"
      @update:brushSize="brushSize = $event"
      @update:isTransparent="isTransparent = $event"
      @undo="undoLastDrawing"
      @logout="signOut"
      @request-login="showLoginModal = true"
      @profile-updated="fetchUserProfile"
    />

    <!-- Login Modal Overlay -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="showLoginModal" class="absolute inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="showLoginModal = false">
         <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-1">
            <button @click="showLoginModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <AuthPanel :session="session" @authenticated="handleAuthenticated" />
         </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { supabase } from './supabaseClient';
import MapCanvas from './components/MapCanvas.vue';
import Toolbar from './components/Toolbar.vue';
import AuthPanel from './components/AuthPanel.vue';
import { DrawingTool, DRAWING_COLORS, MAX_ZOOM } from './constants.js';

const session = ref(null);
const drawings = ref([]);
const currentTool = ref(DrawingTool.HAND); 
const currentColor = ref(DRAWING_COLORS[0]);
const brushSize = ref(1.0); 
const isTransparent = ref(false);
const showLoginModal = ref(false);
const mapCanvasRef = ref(null);
const userProfile = ref(null);
const isLoadingDrawings = ref(true);
const loadError = ref(null);
const actionHistory = ref([]);
const isUndoing = ref(false);
const currentBounds = ref(null);

const userEmail = computed(() => session.value?.user?.email);
const user = computed(() => session.value?.user);
const userId = computed(() => session.value?.user?.id);

// Auth Logic
async function refreshSession() {
  console.log('App: Attempting to restore session...');
  try {
      // Add timeout to getSession to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timed out')), 2000) // Reduced to 2s for faster fallback
      );
      
      const sessionPromise = supabase.auth.getSession();
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

      if (error) throw error;
      
      if (data.session) {
          console.log('App: Session restored successfully (Client):', data.session.user.email);
          session.value = data.session;
      } else {
          console.log('App: No active session found via Client.');
      }
  } catch (e) {
      console.error('App: refreshSession failed:', e);
      
      // Fallback: Try to recover from localStorage manually
      console.log('App: Trying manual localStorage recovery...');
      try {
          let recoveredSession = null;
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              // Supabase v2 default key pattern: sb-<project-ref>-auth-token
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                  const itemStr = localStorage.getItem(key);
                  if (itemStr) {
                      const item = JSON.parse(itemStr);
                      // Check if it looks like a session object
                      if (item.access_token && item.user) {
                          recoveredSession = item;
                          break;
                      }
                  }
              }
          }
          
          if (recoveredSession) {
              console.log('App: Manually recovered session from storage:', recoveredSession.user.email);
              
              // Await the session sync to ensure token is valid/refreshed before proceeding
              try {
                  const { data: syncData, error: syncError } = await supabase.auth.setSession({
                      access_token: recoveredSession.access_token,
                      refresh_token: recoveredSession.refresh_token
                  });

                  if (syncError) {
                      console.warn('App: Client sync failed:', syncError.message);
                      // If sync fails (e.g. invalid refresh token), clear the invalid session
                      session.value = null;
                  } else if (syncData?.session) {
                      console.log('App: Client synced and session refreshed');
                      // Update with the potentially refreshed session
                      session.value = syncData.session;
                  } else {
                      // Fallback if setSession returns no session but no error (rare)
                      session.value = recoveredSession;
                  }
              } catch (syncErr) {
                  console.warn('App: Client sync exception:', syncErr);
                  session.value = recoveredSession; // Best effort
              }
              
          } else {
              console.log('App: No session found in localStorage.');
          }
      } catch (recoveryErr) {
          console.error('App: Manual recovery failed:', recoveryErr);
      }
  }
}

async function signOut() {
  console.log('App: Signing out...');
  
  // 1. Clear local state immediately
  session.value = null;
  currentTool.value = DrawingTool.HAND;
  drawings.value = []; 
  actionHistory.value = []; // Optional: Clear drawings on logout if desired, or keep them visible
  
  // 2. Clear localStorage manually (Supabase v2 keys)
  try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              keysToRemove.push(key);
          }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log('App: Local storage cleared.');
  } catch (e) {
      console.error('App: Failed to clear local storage:', e);
  }

  // 3. Call Supabase signOut (don't await if it hangs)
  supabase.auth.signOut().then(() => {
      console.log('App: Supabase client signed out.');
  }).catch(err => {
      console.warn('App: Supabase signOut error (ignored):', err);
  });
}

function handleAuthenticated(newSession) {
    console.log('App: handleAuthenticated called with:', newSession);
    if (newSession) {
        session.value = newSession;
        // Fetch drawings immediately after login
        fetchDrawings();
        // Locate user and zoom to max
        locateUser();
    } else {
        refreshSession();
    }
    showLoginModal.value = false;
}

function locateUser() {
    if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            console.log('App: User location found:', latitude, longitude);
            if (mapCanvasRef.value) {
                // Zoom to MAX_ZOOM (18)
                mapCanvasRef.value.setView([latitude, longitude], MAX_ZOOM);
            }
        },
        (error) => {
            console.warn('App: Geolocation failed:', error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// User Profile Logic
async function fetchUserProfile() {
    if (!userId.value) {
        userProfile.value = null;
        return;
    }
    
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile Fetch Timeout')), 5000)
        );

        const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', userId.value)
            .maybeSingle();
            
        const { data, error } = await Promise.race([profilePromise, timeoutPromise]);
            
        if (data) {
            console.log('App: Fetched user profile (Client):', data);
            userProfile.value = data;
            return;
        } else if (error) {
            throw error;
        } else {
            console.log('App: No profile found for user (Client).');
        }
    } catch (e) {
        console.warn('App: Profile fetch client failed, trying fallback...', e);
        
        // Fallback: Raw Fetch
        try {
            const envUrl = import.meta.env.VITE_SUPABASE_URL;
            const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const token = session.value?.access_token;
            
            if (!token) throw new Error('No token for profile fetch');

            const res = await fetch(`${envUrl}/rest/v1/profiles?id=eq.${userId.value}&select=*`, {
                method: 'GET',
                headers: {
                    'apikey': envKey,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'Accept': 'application/vnd.pgrst.object+json' // Request single object
                }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            console.log('App: Fetched user profile (Raw Fetch):', data);
            userProfile.value = data;
            
        } catch (fetchErr) {
            console.error('App: All profile fetch attempts failed', fetchErr);
        }
    }
}

// Utility: Debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Viewport Logic
const handleViewportChange = debounce((bounds) => {
    console.log('App: Viewport changed:', bounds);
    currentBounds.value = bounds;
    fetchDrawings(bounds);
}, 500); // 500ms debounce

// Drawing Logic
async function fetchDrawings(bounds = null) {
    console.log('App: Fetching drawings...', bounds ? 'with bounds' : 'global');
    isLoadingDrawings.value = true;
    loadError.value = null;
    
    // 1. Try Supabase Client
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fetch Client Timeout')), 30000)
        );
        
        let query = supabase
            .from('drawings')
            .select('*', { count: 'exact' });

        // Apply Spatial Filters if bounds exist
        if (bounds) {
            query = query
                .gte('center_lat', bounds.minLat)
                .lte('center_lat', bounds.maxLat)
                .gte('center_lng', bounds.minLng)
                .lte('center_lng', bounds.maxLng);
        }

        // Always order by newest first and limit
        query = query
            .order('created_at', { ascending: false })
            .limit(5000); 
            
        const result = await Promise.race([query, timeoutPromise]);
        const { data, error } = result;
        
        if (error) throw error;
        
        console.log('App: Fetched drawings (Client):', data?.length, 'Total in DB:', result.count);
        // Reverse to oldest-first for rendering
        drawings.value = data ? data.reverse() : [];
        isLoadingDrawings.value = false;
        return; // Success
    } catch (clientErr) {
        console.warn('App: Fetch Client failed, trying Raw Fetch fallback...', clientErr);
    }

    // 2. Fallback: Raw Fetch
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const envUrl = import.meta.env.VITE_SUPABASE_URL;
        const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const token = session.value?.access_token;
        
        const headers = {
            'apikey': envKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Construct Query String
        let queryString = 'select=*&order=created_at.desc&limit=5000';
        if (bounds) {
            queryString += `&center_lat=gte.${bounds.minLat}&center_lat=lte.${bounds.maxLat}`;
            queryString += `&center_lng=gte.${bounds.minLng}&center_lng=lte.${bounds.maxLng}`;
        }

        const res = await fetch(`${envUrl}/rest/v1/drawings?${queryString}`, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('App: Fetched drawings (Raw Fetch):', data?.length);
        drawings.value = data ? data.reverse() : [];
        isLoadingDrawings.value = false;

    } catch (fetchErr) {
        console.error('App: All fetch attempts failed', fetchErr);
        loadError.value = fetchErr.message || 'Failed to load drawings';
        isLoadingDrawings.value = false;
        // Only alert if it's not an abort error (which might happen on rapid moves)
        if (fetchErr.name !== 'AbortError') {
             // alert('无法加载历史绘制内容，请检查网络连接或刷新页面重试。\n错误信息: ' + (fetchErr.message || 'Unknown error'));
             console.warn('Suppressing alert for fetch error to avoid spamming user during pan/zoom');
        }
    }
}

async function addDrawing(drawingData) {
    if (!userId.value) {
        console.error('App: addDrawing failed - No user ID');
        alert('请先登录');
        return;
    }

    // Diagnostic: Check Env Vars
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Use local session token directly to avoid getSession() hang
    const token = session.value?.access_token;

    if (!token) {
        console.error('App: No access token available');
        alert('登录会话已过期，请刷新页面重新登录');
        return;
    }

    // Deep clone points
    const rawPoints = JSON.parse(JSON.stringify(drawingData.points));

    // Calculate Center
    let centerLat = 0;
    let centerLng = 0;
    
    if (rawPoints.length > 0) {
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        
        rawPoints.forEach(p => {
            // Handle both array [lat, lng] and object {lat, lng} formats
            const lat = Array.isArray(p) ? p[0] : p.lat;
            const lng = Array.isArray(p) ? p[1] : p.lng;
            
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        });
        
        centerLat = (minLat + maxLat) / 2;
        centerLng = (minLng + maxLng) / 2;
    }

    // Create Optimistic Drawing Object
    const tempId = drawingData.id || ('temp-' + Date.now() + Math.random());
    const newDrawing = {
        id: drawingData.id,
        user_id: userId.value,
        user_name: userProfile.value?.user_name || user.value?.user_metadata?.user_name || 'Unknown',
        tool: drawingData.tool,
        color: drawingData.color,
        weight: drawingData.weight,
        points: rawPoints,
        text: drawingData.text,
        created_zoom: drawingData.createdZoom || drawingData.created_zoom,
        center_lat: centerLat,
        center_lng: centerLng
    };

    // Optimistic UI: Add to local state immediately with syncing flag
    const optimisticDrawing = { ...newDrawing, id: tempId, isSyncing: true };
    drawings.value.push(optimisticDrawing);

    console.log('App: Saving drawing payload (Optimistic):', newDrawing);

    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Client Request timed out (5s)')), 5000)
        );

        const insertPromise = supabase
            .from('drawings')
            .insert(newDrawing)
            .select()
            .single();

        const result = await Promise.race([insertPromise, timeoutPromise]);
        const { data, error } = result;

        if (error) throw error;
        
        if (data) {
            console.log('App: Drawing saved successfully (Client):', data);
            
            if (!isUndoing.value) {
                actionHistory.value.push({ type: 'ADD', id: data.id });
            }

            // Replace optimistic drawing with real one
            const index = drawings.value.findIndex(d => d.id === tempId);
            if (index !== -1) {
                drawings.value.splice(index, 1, data);
            } else {
                // If not found (maybe cleared?), just push
                if (!drawings.value.find(d => d.id === data.id)) {
                    drawings.value.push(data);
                }
            }
            return; // Success
        }
    } catch (clientErr) {
        console.warn('App: Supabase Client failed, trying raw REST API fallback...', clientErr);
        
        // Fallback: Raw Fetch
        try {
            const rawResponse = await fetch(`${envUrl}/rest/v1/drawings`, {
                method: 'POST',
                headers: {
                    'apikey': envKey,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newDrawing)
            });

            if (!rawResponse.ok) {
                const errorText = await rawResponse.text();
                throw new Error(`HTTP ${rawResponse.status}: ${errorText}`);
            }

            const rawData = await rawResponse.json();
            console.log('App: Drawing saved successfully (Raw Fetch):', rawData);
            
            const savedItem = Array.isArray(rawData) ? rawData[0] : rawData;
            
            if (!isUndoing.value) {
                actionHistory.value.push({ type: 'ADD', id: savedItem.id });
            }

            // Replace optimistic drawing with real one
            const index = drawings.value.findIndex(d => d.id === tempId);
            if (index !== -1) {
                drawings.value.splice(index, 1, savedItem);
            } else {
                if (!drawings.value.find(d => d.id === savedItem.id)) {
                    drawings.value.push(savedItem);
                }
            }
        } catch (fetchErr) {
            console.error('App: All save attempts failed.', fetchErr);
            alert('保存彻底失败: ' + fetchErr.message);
            // Rollback optimistic update
            const index = drawings.value.findIndex(d => d.id === tempId);
            if (index !== -1) {
                drawings.value.splice(index, 1);
            }
        }
    }
}

async function removeDrawing(id) {
    if (!userId.value) return;

    // History Tracking
    if (!isUndoing.value) {
        const drawing = drawings.value.find(d => d.id === id);
        if (drawing) {
            actionHistory.value.push({ 
                type: 'REMOVE', 
                drawing: JSON.parse(JSON.stringify(drawing)) 
            });
        }
    }

    // Optimistic remove
    const index = drawings.value.findIndex(d => d.id === id);
    if (index !== -1) {
        drawings.value.splice(index, 1);
    }

    const { error } = await supabase.from('drawings').delete().eq('id', id).eq('user_id', userId.value);
    if (error) {
        console.error('Error removing drawing:', error);
        // Revert if needed, but for delete usually we just accept it might fail silently or refresh
        fetchDrawings(); 
    }
}

async function updateDrawing(updatedDrawing) {
    if (!userId.value) return;

    // History Tracking
    if (!isUndoing.value) {
        const oldDrawing = drawings.value.find(d => d.id === updatedDrawing.id);
        if (oldDrawing) {
            actionHistory.value.push({ 
                type: 'UPDATE', 
                id: updatedDrawing.id,
                prevPoints: JSON.parse(JSON.stringify(oldDrawing.points)),
                newPoints: JSON.parse(JSON.stringify(updatedDrawing.points))
            });
        }
    }

    // Optimistic Update
    const index = drawings.value.findIndex(d => d.id === updatedDrawing.id);
    if (index !== -1) {
        // Create a new object to trigger reactivity
        const newDrawing = { ...drawings.value[index], ...updatedDrawing, isSyncing: true };
        drawings.value.splice(index, 1, newDrawing);
    }

    try {
        const { error } = await supabase
            .from('drawings')
            .update({ 
                points: updatedDrawing.points,
                updated_at: new Date().toISOString()
            })
            .eq('id', updatedDrawing.id)
            .eq('user_id', userId.value);

        if (error) throw error;
        
        // Update success state
        const newIndex = drawings.value.findIndex(d => d.id === updatedDrawing.id);
        if (newIndex !== -1) {
             drawings.value[newIndex].isSyncing = false;
        }

    } catch (err) {
        console.error('Error updating drawing:', err);
        // Revert on error
        fetchDrawings();
    }
}

async function undoLastDrawing() {
    if (!userId.value) return;
    if (actionHistory.value.length === 0) return;

    const lastAction = actionHistory.value.pop();
    isUndoing.value = true;

    try {
        console.log('App: Undoing action:', lastAction.type);
        
        if (lastAction.type === 'ADD') {
            await removeDrawing(lastAction.id);
        } 
        else if (lastAction.type === 'REMOVE') {
            // Restore the drawing
            await addDrawing(lastAction.drawing);
        } 
        else if (lastAction.type === 'UPDATE') {
            // Revert points
            await updateDrawing({ 
                id: lastAction.id, 
                points: lastAction.prevPoints 
            });
        }
    } catch (e) {
        console.error('App: Undo failed:', e);
    } finally {
        isUndoing.value = false;
    }
}

// Realtime Subscription
let realtimeChannel;

function subscribeToDrawings() {
    realtimeChannel = supabase
        .channel('public:drawings')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drawings' }, (payload) => {
            console.log('App: Realtime INSERT received:', payload.new);
            // Deduplicate: Only add if we don't have it yet
            if (!drawings.value.find(d => d.id === payload.new.id)) {
                drawings.value.push(payload.new);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drawings' }, (payload) => {
            console.log('App: Realtime DELETE received:', payload.old);
            const index = drawings.value.findIndex(d => d.id === payload.old.id);
            if (index !== -1) {
                drawings.value.splice(index, 1);
            }
        })
        .subscribe((status) => {
            console.log('App: Realtime subscription status:', status);
        });
}

onMounted(async () => {
    // 1. Initialize Session
    await refreshSession();
    
    // 2. Fetch User Profile (Data fetch is now triggered by MapCanvas viewport-change)
    await fetchUserProfile();
    
    // 3. Subscribe to Realtime
    subscribeToDrawings();

    // 4. Force fetch drawings to ensure we have data after session restore
    // Only fetch if we haven't received bounds yet (to avoid double fetch if map is fast)
    if (!currentBounds.value) {
        console.log('App: Session ready, force fetching global drawings...');
        fetchDrawings(null);
    } else {
        console.log('App: Session ready, bounds already present, skipping force fetch.');
    }

    // 5. Listen for Auth Changes (Login/Logout/Token Refresh)
    supabase.auth.onAuthStateChange((_event, _session) => {
        console.log('App: onAuthStateChange:', _event, _session ? 'Session Present' : 'No Session');
        
        const previousUser = session.value?.user?.id;
        session.value = _session;
        
        if (_session) {
            showLoginModal.value = false;
            // Always refetch profile on auth change to ensure freshness
            console.log('App: Auth changed, refetching profile...');
            fetchUserProfile();
            
            if (_session.user.id !== previousUser) {
                console.log('App: User changed, refetching drawings...');
                fetchDrawings();
            }
        } else {
            userProfile.value = null;
        }
    });
});

onBeforeUnmount(() => {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
});
</script>

<style scoped>
/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
