revoke execute on function public.audit_entry_update() from public, anon, authenticated;
revoke execute on function public.guard_entry_review() from public, anon, authenticated;
revoke execute on function public.join_city(text,text) from public, anon;
grant execute on function public.join_city(text,text) to authenticated;
revoke execute on function public.register_city(text,text,text,text) from public, anon;
grant execute on function public.register_city(text,text,text,text) to authenticated;