'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  LogIn,
  Trash2,
  MapPin,
  PenTool,
  Eye,
  FileText,
  ShieldCheck,
  UserX,
  ChevronRight,
} from 'lucide-react';
import { Compliance } from '@/lib/compliance';

interface UserMenuProps {
  onLoginClick?: () => void;
}

interface Stats {
  pins: number;
  drawings: number;
  views: number;
}

/**
 * UserMenu — rich profile popover for logged‑in users (mirrors iOS profile).
 * Shows identity card, stats, support & legal, log out, delete account.
 */
export default function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        className="gap-1.5 border-gray-200/60 bg-gray-100/80 shadow-md backdrop-blur-md hover:bg-gray-200/80"
        onClick={onLoginClick}
      >
        <LogIn className="h-3.5 w-3.5" />
        Log in
      </Button>
    );
  }

  const displayName = profile?.userName ?? user.userName ?? 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const handle = `@${user.email?.split('@')[0] ?? user.id.slice(0, 8)}`;

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
      )
    )
      return;
    setDeleting(true);
    try {
      await fetch('/api/profile', { method: 'DELETE' });
    } catch {
      // ignore
    }
    signOut();
  };

  const showBlockedUsers = () => {
    const blocked = Compliance.getBlockedUsers();
    if (blocked.length === 0) {
      window.alert('No users blocked yet.');
    } else {
      const msg = blocked.map((id, i) => `${i + 1}. ${id}`).join('\n');
      if (window.confirm(`Blocked users:\n${msg}\n\nClick OK to unblock all.`)) {
        blocked.forEach((id) => Compliance.unblockUser(id));
        window.alert('All users have been unblocked.');
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full border border-gray-200/60 bg-gray-100/80 backdrop-blur-md"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-xl border-gray-200/60 bg-white/95 p-0 shadow-2xl backdrop-blur-xl"
      >
        {/* ===== Identity Card ===== */}
        <div className="flex flex-col items-center px-5 pt-5 pb-4">
          {/* Avatar */}
          <div className="relative mb-3">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-16 w-16 rounded-full border-[3px] border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-primary text-lg font-semibold text-primary-foreground shadow-lg">
                {initials}
              </div>
            )}
            {/* Online badge */}
            <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[2.5px] border-white bg-green-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-500">{handle}</p>

          {/* Stats row */}
          <div className="mt-3 flex w-full items-center justify-center gap-0 rounded-lg bg-gray-50 py-2.5">
            <StatItem
              icon={<MapPin className="h-3 w-3 text-blue-500" />}
              value={stats?.pins ?? '–'}
              label="Pins"
            />
            <div className="mx-3 h-6 w-px bg-gray-200" />
            <StatItem
              icon={<PenTool className="h-3 w-3 text-purple-500" />}
              value={stats?.drawings ?? '–'}
              label="Drawings"
            />
            <div className="mx-3 h-6 w-px bg-gray-200" />
            <StatItem
              icon={<Eye className="h-3 w-3 text-green-500" />}
              value={stats?.views ?? '–'}
              label="Views"
            />
          </div>
        </div>

        {/* ===== Support & Legal ===== */}
        <div className="border-t border-gray-100 px-2 py-1.5">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Support & Legal
          </p>
          <MenuItem
            icon={<FileText className="h-3.5 w-3.5 text-blue-500" />}
            label="Terms of Service"
            onClick={() =>
              window.alert(
                'Terms of Service\n\nBy using NiubiAgent, you agree to our terms.\n\n1. No hate speech or bullying.\n2. No spam or unsolicited advertising.\n3. Respect privacy of others.\n\nViolations will result in account suspension.'
              )
            }
          />
          <MenuItem
            icon={<ShieldCheck className="h-3.5 w-3.5 text-green-500" />}
            label="Privacy Policy"
            onClick={() =>
              window.alert(
                'Privacy Policy\n\nWe collect location data only to display your position on the map. We do not sell your data.'
              )
            }
          />
          <MenuItem
            icon={<UserX className="h-3.5 w-3.5 text-orange-500" />}
            label="Blocked Users"
            onClick={showBlockedUsers}
          />
        </div>

        {/* ===== Footer Actions ===== */}
        <div className="border-t border-gray-100 px-2 py-1.5">
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            onClick={() => { setOpen(false); signOut(); }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>
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
