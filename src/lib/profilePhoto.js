import { supabase } from "./supabase";

export const avatarUrl = (path) =>
  path && supabase
    ? supabase.storage.from("nextup-avatars").getPublicUrl(path).data.publicUrl
    : null;
