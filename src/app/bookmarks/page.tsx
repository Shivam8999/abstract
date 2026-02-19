import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookmarkList from "@/components/BookmarkList";

export const dynamic = "force-dynamic";

export interface Bookmark {
    id: string;
    user_id: string;
    title: string;
    url: string;
    note: string;
    created_at: string;
}

export default async function BookmarksPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });

    return (
        <BookmarkList
            initialBookmarks={(bookmarks as Bookmark[]) || []}
            userEmail={user.email || ""}
            userId={user.id}
        />
    );
}
