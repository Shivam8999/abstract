"use client";

import { createClient } from "@/lib/supabase/client";
import type { Bookmark } from "@/app/bookmarks/page";
import {
    LogOut,
    Plus,
    Trash2,
    ExternalLink,
    BookmarkIcon,
    Link as LinkIcon,
    FileText,
    Type,
    Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

interface BookmarkListProps {
    initialBookmarks: Bookmark[];
    userEmail: string;
    userId: string;
}

export default function BookmarkList({
    initialBookmarks,
    userEmail,
    userId,
}: BookmarkListProps) {
    const supabase = createClient();
    const router = useRouter();
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel("bookmarks-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newBookmark = payload.new as Bookmark;
                    setBookmarks((prev) => {
                        // Avoid duplicates (we also add optimistically)
                        if (prev.some((b) => b.id === newBookmark.id)) return prev;
                        return [newBookmark, ...prev];
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const deletedId = (payload.old as { id: string }).id;
                    setBookmarks((prev) => prev.filter((b) => b.id !== deletedId));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);


    const fetchInitialData = async () => {
        try {
            const { data } = await supabase.from("bookmarks").select("*").order("created_at", { ascending: false })
            if (data) {
                setBookmarks(data as Bookmark[])
            }
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        fetchInitialData()
    }, [fetchInitialData]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !url.trim()) return;

        setIsSubmitting(true);

        const { data: authDebug, error: authDebugError } =
            await supabase.rpc("debug_auth");

        console.log("AUTH DEBUG RESULT:", authDebug, authDebugError);


        const { data, error } = await supabase
            .from("bookmarks")
            .insert({
                title: title.trim(),
                url: url.trim(),
                note: note.trim(),
                user_id: userId,
            })
            .select()
            .single();

        if (!error && data) {
            // Add optimistically — realtime will deduplicate
            setBookmarks((prev) => {
                if (prev.some((b) => b.id === data.id)) return prev;
                return [data as Bookmark, ...prev];
            });
            setTitle("");
            setUrl("");
            setNote("");
            setShowForm(false);
        }

        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setBookmarks((prev) => prev.filter((b) => b.id !== id));

        const { error } = await supabase.from("bookmarks").delete().eq("id", id);

        if (error) {
            // Revert on error — re-fetch
            const { data } = await supabase
                .from("bookmarks")
                .select("*")
                .order("created_at", { ascending: false });
            if (data) setBookmarks(data as Bookmark[]);
        }

        setDeletingId(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const ensureProtocol = (inputUrl: string) => {
        if (!/^https?:\/\//i.test(inputUrl)) {
            return `https://${inputUrl}`;
        }
        return inputUrl;
    };

    return (
        <div className="app-container">
            {/* Top Bar */}
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="topbar-brand">
                        <BookmarkIcon size={22} strokeWidth={1.5} />
                        <span className="topbar-title">Abstract</span>
                    </div>
                    <div className="topbar-right">
                        <span className="topbar-email">{userEmail}</span>
                        <button
                            className="btn-logout"
                            onClick={handleSignOut}
                            title="Sign out"
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                <div className="content-header">
                    <div>
                        <h1 className="page-title">My Bookmarks</h1>
                        <p className="page-subtitle">
                            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""} saved
                        </p>
                    </div>
                    <button
                        className="btn-add"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <Plus size={18} />
                        <span>{showForm ? "Cancel" : "Add Bookmark"}</span>
                    </button>
                </div>

                {/* Add Bookmark Form */}
                {showForm && (
                    <div className="form-card">
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="title">
                                        <Type size={14} />
                                        Title
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        placeholder="e.g. React Documentation"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="url">
                                        <LinkIcon size={14} />
                                        URL
                                    </label>
                                    <input
                                        id="url"
                                        type="url"
                                        placeholder="e.g. https://react.dev"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group form-group-full">
                                    <label htmlFor="note">
                                        <FileText size={14} />
                                        Note
                                        <span className="label-optional">(optional)</span>
                                    </label>
                                    <input
                                        id="note"
                                        type="text"
                                        placeholder="A short note about this bookmark..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Save Bookmark
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bookmarks List */}
                {bookmarks.length === 0 ? (
                    <div className="empty-state">
                        <BookmarkIcon size={48} strokeWidth={1} />
                        <h2>No bookmarks yet</h2>
                        <p>Click &quot;Add Bookmark&quot; to save your first link.</p>
                    </div>
                ) : (
                    <div className="bookmark-list">
                        {bookmarks.map((bookmark) => (
                            <div key={bookmark.id} className="bookmark-item">
                                <div className="bookmark-content">
                                    <div className="bookmark-header">
                                        <a
                                            href={ensureProtocol(bookmark.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bookmark-title-link"
                                        >
                                            {bookmark.title}
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                    <p className="bookmark-url">{bookmark.url}</p>
                                    {bookmark.note && (
                                        <p className="bookmark-note">{bookmark.note}</p>
                                    )}
                                    <span className="bookmark-date">
                                        {formatDate(bookmark.created_at)}
                                    </span>
                                </div>
                                <button
                                    className="btn-delete"
                                    onClick={() => {
                                        console.log(bookmark.id)
                                        handleDelete(bookmark.id)
                                    }}
                                    disabled={deletingId === bookmark.id}
                                    title="Delete bookmark"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
