'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, LogIn } from 'lucide-react';

interface UserMenuProps {
  onLoginClick?: () => void;
}

/**
 * UserMenu — dropdown for logged-in user, or login button for guests.
 */
export default function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, profile, signOut } = useAuth();

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
        登录
      </Button>
    );
  }

  const displayName = profile?.userName ?? user.userName ?? '用户';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border-gray-200/60 bg-gray-100/90 shadow-xl backdrop-blur-md">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>个人资料</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
