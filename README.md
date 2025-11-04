# 基于vibecoding的简单dem

## Overview
这是一个最小化的 Supabase CRUD 演示项目，仅保留邮箱注册/登录与留言板增删改查，方便快速学习 Supabase 的基础用法。

### 功能点
- 邮箱注册 / 登录：注册时输入邮箱与密码，自动发送验证邮件；邮箱验证后即可使用密码登录。
- 留言板增删改查（直接调用 Supabase 数据表，受 RLS 保护）。

## 页面结构
- 顶部展示项目标题与当前登录邮箱、退出按钮。
- 主页区域说明项目目标并提供邮箱注册/登录表单。
- 留言板区域显示历史留言并支持新增、编辑、删除。

## 环境配置
- 本地开发使用 `.env.local` 写入 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`（仅保存在本地）。
- `.vscode/mcp.json` 已预置 `supabase` MCP 服务器，可在 VS Code 中直接连接 Supabase。
- 在 Supabase 控制台初始化 `messages` 表并启用 RLS，例如：

	```sql
	create extension if not exists "pgcrypto";

	create table if not exists public.messages (
		id uuid primary key default gen_random_uuid(),
		author_id uuid not null references auth.users(id) on delete cascade,
		content text not null,
		created_at timestamptz default now(),
		updated_at timestamptz default now()
	);

	create or replace function public.set_updated_at()
	returns trigger as $$
	begin
		new.updated_at = now();
		return new;
	end;
	$$ language plpgsql;

	create or replace function public.set_message_owner()
	returns trigger
	language plpgsql
	security definer
	set search_path = public, auth
	as $$
	begin
		new.author_id = auth.uid();
		return new;
	end;
	$$;

	drop trigger if exists trg_messages_updated_at on public.messages;
	create trigger trg_messages_updated_at
		before update on public.messages
		for each row execute function public.set_updated_at();

	drop trigger if exists trg_messages_set_owner on public.messages;
	create trigger trg_messages_set_owner
		before insert on public.messages
		for each row execute function public.set_message_owner();

	alter table public.messages enable row level security;

	create policy "Messages are readable by everyone"
		on public.messages for select using (true);

	create policy "Messages are writable by owner"
		on public.messages for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
	
	create or replace function public.delete_current_user()
	returns void
	language plpgsql
	security definer
	set search_path = public, auth
	as $$
	declare
		current_uid uuid := auth.uid();
	begin
		if current_uid is null then
			raise exception 'missing auth context';
		end if;

		delete from public.messages where author_id = current_uid;
		delete from auth.users where id = current_uid;
	end;
	$$;

	revoke all on function public.delete_current_user() from public;
	grant execute on function public.delete_current_user() to authenticated;
	```

- ⚠️ 上述函数与触发器需要使用服务角色（如 Supabase SQL Editor 默认的 `postgres`）执行，以便 `security definer` 能够设置 `author_id` 并删除 `auth.users`。请确认这些对象的所有者为 `postgres`，否则注销或插入时会报无权限错误。

## 部署建议
- 代码托管在 GitHub，可通过 Cloudflare Pages 或其他静态托管平台自动构建发布。
- 将 Supabase URL 与 anon key 配置为部署平台的环境变量，并在 Supabase Auth 设置中开启“Email confirmations”。

## 本地开发
1. `npm install`
2. `cp .env.example .env.local` 并写入 Supabase 配置。
3. `npm run dev` 启动 Vite，本地访问 http://localhost:5173。


