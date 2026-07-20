'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import ExportMenu from '@/components/toolbar/ExportMenu';
import { useI18n } from '@/lib/i18n';
import {
  LogOut,
  LogIn,
  Trash2,
  MapPin,
  PenTool,
  FileText,
  ShieldCheck,
  UserX,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import {
  type BlockedUser,
  type BlockedUsersResponse,
  type UserProfileStats,
} from '@niubi/shared';

/** Resolve avatar URL — prefix with /api/files for R2-stored paths */
function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // R2 key like /avatars/userId/avatar.jpg → /api/files/avatars/...
  const cleaned = url.replace(/^\//, '');
  return `/api/files/${cleaned}`;
}

interface UserMenuProps {
  onLoginClick?: () => void;
}

/**
 * UserMenu — rich profile popover for logged‑in users (mirrors iOS profile).
 * Shows identity card, stats, support & legal, log out, delete account.
 */
export default function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, profile, signOut, refreshUser } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedExpanded, setBlockedExpanded] = useState(false);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<'main' | 'account'>('main');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch stats when popover opens
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile/stats');
        if (res.ok && !cancelled) {
          setStats(await res.json());
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  // Guest state — show login button
  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="liquid-glass relative h-10 gap-1.5 rounded-full px-4 hover:bg-white/50"
        onClick={onLoginClick}
      >
        <LogIn className="h-3.5 w-3.5" />
        {t('menuLogin')}
      </Button>
    );
  }

  const displayName = profile?.userName ?? user.userName ?? t('menuUserFallback');
  const initials = displayName.slice(0, 2).toUpperCase();
  const handle = `@${user.email?.split('@')[0] ?? user.id.slice(0, 8)}`;

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('menuDeleteConfirm'))) return;
    setDeleting(true);
    try {
      const response = await fetch('/api/profile', { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await signOut();
    } catch {
      window.alert(t('menuDeleteFailed'));
      setDeleting(false);
    }
  };

  const toggleBlockedUsers = async () => {
    if (blockedExpanded) {
      setBlockedExpanded(false);
      return;
    }
    setBlockedExpanded(true);
    setBlockedLoading(true);
    try {
      const response = await fetch('/api/block');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as BlockedUsersResponse;
      setBlockedUsers(data.items);
    } catch {
      setBlockedUsers([]);
    } finally {
      setBlockedLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setUnblockingId(userId);
    try {
      const response = await fetch('/api/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: userId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setBlockedUsers((users) => users.filter((user) => user.userId !== userId));
    } catch {
      window.alert(t('menuUnblockFailed'));
    } finally {
      setUnblockingId(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.alert(t('menuUploadTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = (await uploadRes.json()) as { url: string };
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });
      await refreshUser();
    } catch {
      window.alert(t('menuUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const avatarSrc = resolveAvatarUrl(profile?.avatarUrl);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setMenuView('main');
          setBlockedExpanded(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="liquid-glass relative h-10 w-10 rounded-full p-0"
          aria-label={displayName}
        >
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={displayName}
              width={32}
              height={32}
              unoptimized
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="liquid-glass-panel w-72 rounded-3xl p-0"
      >
        {menuView === 'main' ? (
          <>
            {/* ===== Identity Card ===== */}
            <div className="flex flex-col items-center px-5 pt-5 pb-4">
              <div className="relative mb-3">
                <button
                  className="group relative cursor-pointer rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label={t('menuChangeAvatar')}
                >
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={displayName}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full border-[3px] border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-primary text-lg font-semibold text-primary-foreground shadow-lg">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/30">
                    <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[2.5px] border-white bg-green-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{handle}</p>

              <div className="mt-3 flex w-full items-center justify-center gap-0 rounded-full bg-white/45 py-2.5">
                <StatItem
                  icon={<MapPin className="h-3 w-3 text-blue-500" />}
                  value={stats?.pins ?? '–'}
                  label={t('menuPins')}
                />
                <div className="mx-3 h-6 w-px bg-gray-200" />
                <StatItem
                  icon={<PenTool className="h-3 w-3 text-purple-500" />}
                  value={stats?.drawings ?? '–'}
                  label={t('menuDrawings')}
                />
              </div>
            </div>

            {/* ===== Language ===== */}
            <div className="border-t border-white/50 px-2 py-1.5">
              <div className="mb-1 rounded-full bg-white/40 px-3 py-1.5">
                <LanguageSelector compact />
              </div>
            </div>

            {/* ===== Footer Actions ===== */}
            <div className="border-t border-white/50 px-2 py-1.5">
              <ExportMenu variant="profile" />
              <MenuItem
                icon={<Settings2 className="h-3.5 w-3.5 text-gray-500" />}
                label={t('menuAccountPrivacy')}
                onClick={() => setMenuView('account')}
              />
              <button
                className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50/70"
                onClick={() => { setOpen(false); void signOut(); }}
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('menuLogout')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ===== Account & Privacy second-level menu ===== */}
            <div className="flex h-14 items-center border-b border-white/50 px-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-white/60"
                onClick={() => {
                  setMenuView('main');
                  setBlockedExpanded(false);
                }}
                aria-label={t('menuBack')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-gray-900">{t('menuAccountPrivacy')}</p>
            </div>

            <div className="px-2 py-2">
              <MenuItem
                icon={<FileText className="h-3.5 w-3.5 text-blue-500" />}
                label={t('menuTerms')}
                onClick={() => window.open(`/legal/terms?lang=${lang}`, '_blank', 'noopener,noreferrer')}
              />
              <MenuItem
                icon={<ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
                label={t('menuPrivacy')}
                onClick={() => window.open(`/legal/privacy?lang=${lang}`, '_blank', 'noopener,noreferrer')}
              />
              <MenuItem
                icon={<UserX className="h-3.5 w-3.5 text-orange-500" />}
                label={t('menuBlockedUsers')}
                onClick={() => { void toggleBlockedUsers(); }}
              />
              {blockedExpanded && (
                <div className="mx-2 mb-1 max-h-44 overflow-y-auto rounded-2xl bg-white/45 p-2">
                  {blockedLoading ? (
                    <p className="py-2 text-center text-xs text-gray-400">{t('menuBlockedLoading')}</p>
                  ) : blockedUsers.length === 0 ? (
                    <p className="py-2 text-center text-xs text-gray-400">{t('menuBlockedEmpty')}</p>
                  ) : blockedUsers.map((blockedUser) => {
                    const blockedAvatar = resolveAvatarUrl(blockedUser.avatarUrl);
                    return (
                      <div key={blockedUser.userId} className="flex items-center gap-2 border-b border-white/60 py-2 last:border-0">
                        {blockedAvatar ? (
                          <Image src={blockedAvatar} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
                            {blockedUser.userName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-700">{blockedUser.userName}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(blockedUser.blockedAt).toLocaleDateString(
                              lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US',
                            )}
                          </p>
                        </div>
                        <button
                          className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-600 disabled:opacity-50"
                          disabled={unblockingId === blockedUser.userId}
                          onClick={() => { void handleUnblock(blockedUser.userId); }}
                        >
                          {unblockingId === blockedUser.userId ? '…' : t('menuUnblock')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/50 px-2 py-2">
              <button
                className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50/70"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? t('menuDeleting') : t('menuDeleteAccount')}
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- small sub-components ---------- */

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center min-w-[50px]">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
      onClick={onClick}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
    </button>
  );
}
